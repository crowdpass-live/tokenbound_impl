"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import AnalyticsPageView from "@/components/AnalyticsPageView";
import Header from "@/components/Header";
import { useWallet } from "@/contexts/WalletContext";
import { createEvent } from "@/lib/soroban";

const eventSchema = z
  .object({
    theme: z.string().min(1, "Event name required"),
    description: z.string().optional(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    price: z
      .string()
      .min(1, "Price required")
      .refine((s) => !Number.isNaN(parseFloat(s)), "Price must be a number")
      .refine((s) => parseFloat(s) >= 0, "Price cannot be negative")
      .refine((s) => parseFloat(s) <= 1_000_000, "Price is too high"),
    tickets: z
      .string()
      .min(1, "Total tickets required")
      .refine((s) => /^[0-9]+$/.test(s), "Tickets must be a whole number")
      .refine((s) => parseInt(s, 10) > 0, "Must be a positive integer"),
  })
  .superRefine((data, ctx) => {
    if (data.startDate) {
      const start = new Date(data.startDate).getTime();
      if (start <= Date.now()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["startDate"],
          message: "Start date must be in the future",
        });
      }
    }

    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate).getTime();
      const end = new Date(data.endDate).getTime();
      if (end <= start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endDate"],
          message: "End date must be after start date",
        });
      }
    }
  });

type EventFormData = z.infer<typeof eventSchema>;

export default function CreateEventPage() {
  const router = useRouter();
  const { address, isInstalled, connect, providerName, signTransaction } =
    useWallet();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    mode: "onChange",
  });

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const onSubmit = async (data: EventFormData) => {
    let organizerAddress = address;

    if (!organizerAddress) {
      if (isInstalled) {
        await connect();
        organizerAddress = localStorage.getItem("wallet_address");
      } else {
        alert(
          `Please install ${providerName} (or another Stellar wallet) to create an event.`
        );
        return;
      }
    }

    if (!organizerAddress) {
      setErrorMsg("Connect your wallet before creating an event.");
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");

    try {
      const startUnix = Math.floor(new Date(data.startDate).getTime() / 1000);
      const endUnix = Math.floor(new Date(data.endDate).getTime() / 1000);
      const ticketPrice = BigInt(
        Math.floor(parseFloat(data.price) * 10_000_000)
      );
      const totalTickets = BigInt(parseInt(data.tickets, 10));

      const paymentToken =
        "0000000000000000000000000000000000000000000000000000000000000000";

      const res = await createEvent(
        {
          organizer: organizerAddress,
          theme: data.theme,
          eventType: data.description || "",
          startTimeUnix: startUnix,
          endTimeUnix: endUnix,
          ticketPrice,
          totalTickets,
          paymentToken,
        },
        signTransaction
      );

      setSuccessMsg(`Event created (ledger ${res.ledger}, tx ${res.hash})`);
      setTimeout(() => router.push("/"), 3000);
    } catch (err: unknown) {
      console.error(err);
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Unknown error";
      setErrorMsg(message);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-[#FF5722] selection:text-white">
      <AnalyticsPageView page="create-event" />
      <Header />

      <main className="mx-auto max-w-3xl px-4 pb-20 pt-36 sm:px-6">
        <div className="rounded-[32px] border border-zinc-200 bg-white p-8 text-zinc-900 shadow-xl shadow-zinc-900/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:shadow-black/20">
          <h1 className="mb-2 text-3xl font-bold text-zinc-950 dark:text-white">Create Event</h1>
          <p className="mb-6 text-zinc-600 dark:text-zinc-300">
            Launch a new CrowdPass experience with on-chain pricing, inventory,
            and organizer ownership.
          </p>

          {successMsg && (
            <div className="mb-4 rounded-2xl bg-green-50 p-3 text-green-700 dark:bg-green-500/15 dark:text-green-200">
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="mb-4 rounded-2xl bg-red-50 p-3 text-red-700 dark:bg-red-500/15 dark:text-red-200">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-gray-300">
                  Event Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Stellar DevCon 2026"
                  {...register("theme")}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 transition focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/50 dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder-gray-500"
                />
                {errors.theme && (
                  <p className="mt-1.5 text-sm text-red-400">
                    {errors.theme.message}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  {...register("description")}
                  placeholder="Tell your audience about the event..."
                  rows={4}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 transition focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/50 dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder-gray-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-gray-300">
                  Start Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  {...register("startDate")}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 transition [color-scheme:light] focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/50 dark:border-white/10 dark:bg-black/20 dark:text-white dark:[color-scheme:dark]"
                />
                {errors.startDate && (
                  <p className="mt-1.5 text-sm text-red-400">
                    {errors.startDate.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-gray-300">
                  End Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  {...register("endDate")}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 transition [color-scheme:light] focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/50 dark:border-white/10 dark:bg-black/20 dark:text-white dark:[color-scheme:dark]"
                />
                {errors.endDate && (
                  <p className="mt-1.5 text-sm text-red-400">
                    {errors.endDate.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-gray-300">
                  Ticket Price (XLM)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium text-zinc-500 dark:text-gray-400">
                    XLM
                  </span>
                  <input
                    type="number"
                    step="0.0000001"
                    placeholder="0.00"
                    {...register("price")}
                    className="w-full rounded-xl border border-zinc-300 bg-white py-3 pl-12 pr-4 text-zinc-900 placeholder-zinc-400 transition focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/50 dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder-gray-500"
                  />
                </div>
                {errors.price && (
                  <p className="mt-1.5 text-sm text-red-400">
                    {errors.price.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-gray-300">
                  Total Tickets
                </label>
                <input
                  type="number"
                  placeholder="e.g., 500"
                  {...register("tickets")}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 transition focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/50 dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder-gray-500"
                />
                {errors.tickets && (
                  <p className="mt-1.5 text-sm text-red-400">
                    {errors.tickets.message}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-gray-300">
                  Event Image (optional)
                </label>
                <div className="w-full rounded-xl border-2 border-dashed border-zinc-300 px-4 py-6 text-center transition hover:bg-zinc-50 focus-within:border-transparent focus-within:ring-2 focus-within:ring-[#FF5722]/50 dark:border-white/20 dark:hover:bg-white/5">
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full cursor-pointer text-sm text-zinc-500 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#FF5722]/10 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-[#FF5722] file:transition hover:file:bg-[#FF5722]/20 dark:text-gray-400"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={
                isSubmitting || (!isValid && Object.keys(errors).length > 0)
              }
              className="w-full rounded-xl bg-[#FF5722] px-6 py-4 text-lg font-bold text-white shadow-[0_0_20px_rgba(255,87,34,0.3)] transition hover:-translate-y-0.5 hover:bg-[#F4511E] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {isSubmitting ? "Creating..." : "Launch Event"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
