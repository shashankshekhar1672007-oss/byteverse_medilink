import { useEffect, useState } from "react";
import {
  orders as ordersApi,
  patients as patientsApi,
} from "../../../services/api";
import { getOrderSummary, STATUS_TO_STEP } from "./orderUtils";

export function useMedicineOrder({ profile, user, showToast } = {}) {
  const [prescription, setPrescription] = useState(null);
  const [orderHistory, setOrderHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("delivery");
  const [ordered, setOrdered] = useState(false);
  const [orderedAt, setOrderedAt] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [prescriptionResponse, orderResponse] = await Promise.all([
        patientsApi.getActivePrescriptions().catch(() => ({ data: [] })),
        ordersApi.getAll({ limit: 10 }).catch(() => ({ data: [] })),
      ]);

      setPrescription(prescriptionResponse.data?.[0] || null);
      setOrderHistory(orderResponse.data || []);
    } catch (e) {
      setError(e.message || "Could not load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const medicines = prescription?.medicines || [];
  const summary = getOrderSummary(medicines, deliveryMode);
  const latestOrder = orderHistory[0] || null;
  const trackedStatus = latestOrder?.status || (ordered ? "pending" : "");
  const currentStep = STATUS_TO_STEP[trackedStatus] || 0;

  const buildShippingAddress = () => {
    const address = profile?.address || {};
    return {
      name: user?.name || "Patient",
      phone: user?.phone || profile?.emergencyContact?.phone || "0000000000",
      street: address.street || "Address not provided",
      city: address.city || "City not provided",
      state: address.state || "State not provided",
      country: address.country || "India",
      pincode: address.pincode || "000000",
    };
  };

  const placeOrder = async () => {
    if (medicines.length === 0 || placing) return;

    setPlacing(true);
    setError("");
    try {
      const payload = {
        prescriptionId: prescription?._id,
        items: medicines.map((medicine) => ({
          name: medicine.name,
          dosage: medicine.dosage,
          frequency: medicine.frequency,
          duration: medicine.duration,
          instructions: medicine.instructions,
          quantity: medicine.quantity || 1,
          unitPrice: 80,
        })),
        shippingAddress: buildShippingAddress(),
        paymentMethod: "cod",
        deliveryFee: summary.delivery + summary.packaging,
        discount: summary.discount,
        notes: deliveryMode === "delivery" ? "Home delivery" : "Store pickup",
      };
      const response = await ordersApi.create(payload);
      setOrderHistory((orders) => [response.data, ...orders]);
      setOrdered(true);
      setOrderedAt(new Date(response.data.createdAt || Date.now()));
      showToast?.("Order placed successfully");
    } catch (e) {
      setError(e.message || "Could not place order");
      showToast?.(e.message || "Could not place order", "error");
    } finally {
      setPlacing(false);
    }
  };

  return {
    currentStep,
    deliveryMode,
    error,
    latestOrder,
    loading,
    medicines,
    orderHistory,
    ordered,
    orderedAt,
    placing,
    prescription,
    summary,
    load,
    placeOrder,
    setDeliveryMode,
  };
}
