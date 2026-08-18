import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getStoredUser } from "../utils/safeStorage";
import { queryKeys } from "../lib/queryClient";
import {
  acceptReservation,
  getStoreReservations,
  rejectReservation,
} from "../services/reservations.service";
import LightLoadingHint from "../shared/LightLoadingHint";
import "../styles/dashboard.css";
import "../styles/Orders.css";
import "../styles/reservations.css";

const STATUS_LABELS = {
  pending: "قيد الانتظار",
  accepted: "مقبول",
  rejected: "مرفوض",
};

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function customerLabel(reservation) {
  return reservation.customerName
    || reservation.customer?.name
    || "زبون";
}

function itemLabel(reservation) {
  return reservation.itemName
    || reservation.item?.name
    || reservation.item?.title
    || "عنصر";
}

export default function Reservations() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = getStoredUser({});
  const baseRoute = user?.role === "supplier" ? "/supplier" : "/store";
  const [status, setStatus] = useState("");
  const [decision, setDecision] = useState(null);
  const [note, setNote] = useState("");
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.storeReservations(status),
    queryFn: async () => {
      const res = await getStoreReservations(status ? { status } : {});
      return res.data;
    },
    staleTime: 15 * 1000,
  });

  const reservations = useMemo(
    () => (Array.isArray(data?.reservations) ? data.reservations : []),
    [data],
  );

  const openChat = (reservation) => {
    const customerId = reservation.customer?._id || reservation.customer;
    if (!customerId) return;
    localStorage.setItem("chatContext", JSON.stringify({
      recipientId: customerId,
      storeOwnerId: customerId,
      productId: reservation.item?._id || reservation.item,
      itemType: reservation.itemType || "Product",
      productName: itemLabel(reservation),
      productImg: reservation.itemImage || reservation.item?.image || "",
      prefillText: `بخصوص حجز: ${itemLabel(reservation)}`,
    }));
    navigate(`${baseRoute}/chats`);
  };

  const openDecision = (reservation, nextStatus) => {
    setDecision({ reservation, nextStatus });
    setNote("");
    setError("");
  };

  const confirmDecision = async () => {
    if (!decision || savingId) return;
    const { reservation, nextStatus } = decision;
    setSavingId(reservation._id);
    setError("");
    try {
      if (nextStatus === "accepted") {
        await acceptReservation(reservation._id, note.trim());
      } else {
        await rejectReservation(reservation._id, note.trim());
      }
      setDecision(null);
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["reservations", "store"] });
    } catch (err) {
      setError(err.response?.data?.message || "تعذّر تحديث الحجز");
    } finally {
      setSavingId("");
    }
  };

  return (
    <div className="orders-page reservations-page">
      <div className="orders-page__head">
        <div>
          <h2 className="title">الحجوزات</h2>
          <p className="orders-page__lead">حجوزات الزبائن على عناصر وعروض متجرك</p>
        </div>
        <select
          className="reservations-filter"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">كل الحالات</option>
          <option value="pending">قيد الانتظار</option>
          <option value="accepted">مقبول</option>
          <option value="rejected">مرفوض</option>
        </select>
      </div>

      {isLoading && <LightLoadingHint label="جاري تحميل الحجوزات..." />}
      {isError && <p className="reservations-error">تعذّر تحميل الحجوزات</p>}

      {!isLoading && reservations.length === 0 && (
        <div className="reservations-empty">لا توجد حجوزات حالياً</div>
      )}

      <div className="reservations-list">
        {reservations.map((reservation) => (
          <article key={reservation._id} className="reservation-card">
            <header className="reservation-card__head">
              <div>
                <h3>{customerLabel(reservation)}</h3>
                <p>الحجز: {itemLabel(reservation)}</p>
              </div>
              <span className={`reservation-status reservation-status--${reservation.status}`}>
                {STATUS_LABELS[reservation.status] || reservation.status}
              </span>
            </header>

            <p className="reservation-card__meta">{formatDateTime(reservation.createdAt)}</p>
            {reservation.customerPhone && (
              <p className="reservation-card__meta">هاتف الحساب: {reservation.customerPhone}</p>
            )}
            {reservation.selectedVariant?.name && (
              <p className="reservation-card__meta">
                المتغير: {reservation.selectedVariant.name}
                {reservation.selectedVariant.values ? ` — ${reservation.selectedVariant.values}` : ""}
              </p>
            )}

            <dl className="reservation-answers">
              {(reservation.answers || []).map((answer) => (
                <div key={`${reservation._id}-${answer.fieldId}`}>
                  <dt>{answer.label}</dt>
                  <dd>{answer.value || "—"}</dd>
                </div>
              ))}
            </dl>

            {reservation.decisionNote && (
              <p className="reservation-card__note">ملاحظة القرار: {reservation.decisionNote}</p>
            )}

            <div className="reservation-card__actions">
              {reservation.status === "pending" && (
                <>
                  <button type="button" className="reservation-btn reservation-btn--accept" onClick={() => openDecision(reservation, "accepted")}>
                    قبول
                  </button>
                  <button type="button" className="reservation-btn reservation-btn--reject" onClick={() => openDecision(reservation, "rejected")}>
                    رفض
                  </button>
                </>
              )}
              <button type="button" className="reservation-btn reservation-btn--chat" onClick={() => openChat(reservation)}>
                رسالة
              </button>
            </div>
          </article>
        ))}
      </div>

      {decision && (
        <div className="store-order-dialog-overlay" onClick={() => !savingId && setDecision(null)} role="presentation">
          <div className="store-order-dialog" onClick={(e) => e.stopPropagation()} dir="rtl" role="dialog" aria-modal="true">
            <h3>{decision.nextStatus === "accepted" ? "قبول الحجز" : "رفض الحجز"}</h3>
            <p className="store-order-dialog__message">ملاحظة (اختياري)</p>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="أضف ملاحظة للزبون إن رغبت"
            />
            {error && <p className="reservations-error">{error}</p>}
            <div className="store-order-dialog__actions">
              <button
                type="button"
                className="store-order-dialog__secondary"
                onClick={() => setDecision(null)}
                disabled={!!savingId}
              >
                إلغاء
              </button>
              <button
                type="button"
                className={decision.nextStatus === "accepted" ? "store-order-dialog__primary" : "store-order-dialog__danger"}
                onClick={confirmDecision}
                disabled={!!savingId}
              >
                {savingId ? "جارٍ..." : "تأكيد"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
