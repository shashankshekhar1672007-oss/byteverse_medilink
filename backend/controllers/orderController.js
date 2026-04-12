const mongoose = require('mongoose');
const Order = require('../models/Order');
const Patient = require('../models/Patient');
const Prescription = require('../models/Prescription');
const { success, error, paginate } = require('../utils/apiResponse');
const { ORDER_STATUS, PAYMENT_STATUS, PAGINATION, ROLES } = require('../utils/constants');

const POPULATE_FIELDS = [
  { path: 'patient', populate: { path: 'userId', select: 'name email phone avatar' } },
  { path: 'prescription', select: 'rxId diagnosis medicines status' },
  { path: 'statusHistory.updatedBy', select: 'name role' },
];

const cancellableStatuses = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PROCESSING,
];

exports.createOrder = async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) return error(res, 'Patient profile not found', 404);

    const {
      prescriptionId,
      items,
      shippingAddress,
      paymentMethod,
      deliveryFee,
      tax,
      discount,
      notes,
    } = req.body;

    let prescription;
    if (prescriptionId) {
      prescription = await Prescription.findOne({
        _id: prescriptionId,
        createdFor: patient._id,
      });
      if (!prescription) return error(res, 'Prescription not found or not yours', 404);
    }

    const orderItems = normalizeItems(items, prescription);
    if (orderItems.length === 0) {
      return error(res, 'Order must include items or a prescription with medicines', 400);
    }

    const order = await Order.create({
      patient: patient._id,
      prescription: prescription?._id,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      deliveryFee,
      tax,
      discount,
      notes,
      statusHistory: [{ status: ORDER_STATUS.PENDING, updatedBy: req.user._id }],
    });

    const populated = await order.populate(POPULATE_FIELDS);
    return success(res, populated, 201);
  } catch (err) {
    next(err);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};

    if (req.query.status) filter.status = req.query.status;

    if (req.user.role === ROLES.PATIENT) {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient) return error(res, 'Patient profile not found', 404);
      filter.patient = patient._id;
    } else if (req.user.role === ROLES.ADMIN) {
      if (req.query.patientId) {
        if (!mongoose.Types.ObjectId.isValid(req.query.patientId)) {
          return error(res, 'Invalid patientId', 400);
        }
        filter.patient = req.query.patientId;
      }
    } else {
      return error(res, 'Not authorized', 403);
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate(POPULATE_FIELDS)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter),
    ]);

    return paginate(res, orders, total, page, limit);
  } catch (err) {
    next(err);
  }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate(POPULATE_FIELDS);
    if (!order) return error(res, 'Order not found', 404);

    const hasAccess = await canAccessOrder(req.user, order);
    if (!hasAccess) return error(res, 'Not authorized', 403);

    return success(res, order);
  } catch (err) {
    next(err);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, paymentStatus, note } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) return error(res, 'Order not found', 404);

    if (status) {
      order.status = status;
      order.statusHistory.push({ status, note, updatedBy: req.user._id });

      if (status === ORDER_STATUS.DELIVERED && !order.deliveredAt) {
        order.deliveredAt = new Date();
      }
      if (status === ORDER_STATUS.CANCELLED && !order.cancelledAt) {
        order.cancelledAt = new Date();
      }
    }

    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    }

    await order.save();
    const populated = await order.populate(POPULATE_FIELDS);

    return success(res, populated);
  } catch (err) {
    next(err);
  }
};

exports.cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return error(res, 'Order not found', 404);

    const hasAccess = await canAccessOrder(req.user, order);
    if (!hasAccess) return error(res, 'Not authorized', 403);

    if (!cancellableStatuses.includes(order.status)) {
      return error(res, `Orders with status '${order.status}' cannot be cancelled`, 400);
    }

    order.status = ORDER_STATUS.CANCELLED;
    order.cancelledAt = new Date();
    order.cancellationReason = req.body.reason;
    order.statusHistory.push({
      status: ORDER_STATUS.CANCELLED,
      note: req.body.reason,
      updatedBy: req.user._id,
    });

    if (order.paymentStatus === PAYMENT_STATUS.PAID) {
      order.paymentStatus = PAYMENT_STATUS.REFUNDED;
    }

    await order.save();
    const populated = await order.populate(POPULATE_FIELDS);

    return success(res, populated);
  } catch (err) {
    next(err);
  }
};

function normalizeItems(items, prescription) {
  if (Array.isArray(items) && items.length > 0) {
    return items.map((item) => ({
      name: item.name,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions,
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
    }));
  }

  if (prescription?.medicines?.length) {
    return prescription.medicines.map((medicine) => ({
      name: medicine.name,
      dosage: medicine.dosage,
      frequency: medicine.frequency,
      duration: medicine.duration,
      instructions: medicine.instructions,
      quantity: medicine.quantity || 1,
      unitPrice: 0,
    }));
  }

  return [];
}

async function canAccessOrder(user, order) {
  if (user.role === ROLES.ADMIN) return true;
  if (user.role !== ROLES.PATIENT) return false;

  const patient = await Patient.findOne({ userId: user._id });
  const orderPatientId = order.patient?._id || order.patient;
  return Boolean(patient && orderPatientId.equals(patient._id));
}

function getPagination(query) {
  const page = Math.max(parseInt(query.page, 10) || PAGINATION.DEFAULT_PAGE, 1);
  const requestedLimit = parseInt(query.limit, 10) || PAGINATION.DEFAULT_LIMIT;
  const limit = Math.min(Math.max(requestedLimit, 1), PAGINATION.MAX_LIMIT);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}
