import api from "./api";

export function getStoreReservations(params = {}) {
  return api.get("/reservations/store", { params });
}

export function getStoreReservationsPendingCount() {
  return api.get("/reservations/store/pending-count");
}

export function acceptReservation(id, decisionNote = "") {
  return api.patch(`/reservations/${id}/accept`, { decisionNote });
}

export function rejectReservation(id, decisionNote = "") {
  return api.patch(`/reservations/${id}/reject`, { decisionNote });
}
