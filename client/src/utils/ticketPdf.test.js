import { describe, expect, it } from "vitest";
import { canDownloadEventTickets, downloadEventTickets } from "./ticketPdf.js";

describe("event ticket availability", () => {
  it("allows active bookings", () => {
    expect(canDownloadEventTickets({ status: "Confirmed" })).toBe(true);
    expect(canDownloadEventTickets({ status: "Rescheduled" })).toBe(true);
  });

  it.each(["Cancelled", "canceled", "REFUNDED", " expired ", "Pending Payment"])("blocks %s bookings", (status) => {
    expect(canDownloadEventTickets({ status })).toBe(false);
  });

  it("refuses download before creating a PDF for a cancelled booking", async () => {
    await expect(downloadEventTickets({ status: "Cancelled" })).rejects.toThrow("Tickets are unavailable");
  });
});
