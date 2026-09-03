"use client";

import { useEffect, useMemo, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Dumbbell, Gift, Menu, Phone, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ServiceKey = "private" | "small_group" | "birthday" | "team_club";
type CalendarEvent = { id: number; reservation_number: string; service: ServiceKey; status: string; start_at: string; end_at: string; booked: number };

const services: { key: ServiceKey; name: string; short: string; duration: string; description: string; icon: typeof Users; tone: string }[] = [
  { key: "private", name: "Private Training", short: "Private", duration: "60 min", description: "Focused one-on-one development built around the player.", icon: Dumbbell, tone: "service-red" },
  { key: "small_group", name: "Small Group", short: "Small Group", duration: "60 min · 7 spots", description: "High-repetition training with no more than seven players.", icon: Users, tone: "service-green" },
  { key: "birthday", name: "Birthday Party", short: "Birthday", duration: "3 hours", description: "A soccer-centered celebration, held while staff confirms details.", icon: Gift, tone: "service-gold" },
  { key: "team_club", name: "Team / Club Practice", short: "Team / Club", duration: "75 min", description: "Purposeful field time for organized teams and clubs.", icon: ShieldCheck, tone: "service-blue" },
];

const slots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

function easternIso(dateKey: string, time: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day, 16, 0));
  const zone = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", timeZoneName: "longOffset" })
    .formatToParts(probe).find((part) => part.type === "timeZoneName")?.value || "GMT-04:00";
  const offset = zone.replace("GMT", "") || "-04:00";
  return new Date(`${dateKey}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00${offset}`).toISOString();
}

function eventDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function serviceInfo(key: ServiceKey) { return services.find((service) => service.key === key)!; }

export default function Home() {
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedService, setSelectedService] = useState<ServiceKey>("small_group");
  const [selectedTime, setSelectedTime] = useState("17:00");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string; number?: string; token?: string } | null>(null);

  const monthKey = format(month, "yyyy-MM");
  const calendarDays = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }),
  }), [month]);

  async function loadCalendar() {
    setCalendarLoading(true);
    try {
      const response = await fetch(`/api/calendar?month=${monthKey}`);
      const payload = await response.json() as { events?: CalendarEvent[] };
      setEvents(payload.events || []);
    } catch { setEvents([]); }
    finally { setCalendarLoading(false); }
  }

  useEffect(() => { void loadCalendar(); }, [monthKey]);
  const dayEvents = events.filter((event) => eventDate(event.start_at) === selectedDate);

  function startBooking(service: ServiceKey, date = selectedDate, time = selectedTime) {
    setSelectedService(service); setSelectedDate(date); setSelectedTime(time); setMessage(null); setBookingOpen(true);
  }

  async function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage(null);
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries()) as Record<string, unknown>;
    body.service = selectedService; body.startAt = easternIso(selectedDate, selectedTime);
    body.consentSms = form.get("consentSms") === "on"; body.acceptedPolicies = form.get("acceptedPolicies") === "on";
    try {
      const response = await fetch("/api/reservations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json() as { error?: string; reservation?: { number: string; token: string; status: string } };
      if (!response.ok || !payload.reservation) throw new Error(payload.error || "We could not complete this reservation");
      setMessage({ type: "success", text: payload.reservation.status === "pending" ? "Request received and held for staff confirmation." : "Your training session is confirmed.", number: payload.reservation.number, token: payload.reservation.token });
      await loadCalendar();
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "We could not complete this reservation" }); }
    finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-[#f4f4f3] text-[#101010]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0b0b]/95 text-white backdrop-blur">
        <div className="mx-auto flex h-20 max-w-[1480px] items-center justify-between px-4 sm:px-7">
          <a href="#calendar" className="brand-link" aria-label="Arcila Training home">
            <img className="brand-logo" src="/arcila-logo.png" alt="Arcila Training" width="560" height="190" />
          </a>
          <nav className="hidden items-center gap-7 text-sm font-semibold md:flex">
            <a className="text-white/70 transition hover:text-white" href="#services">Programs</a><a className="text-white/70 transition hover:text-white" href="#calendar">Calendar</a><a className="text-white/70 transition hover:text-white" href="#contact">Contact</a><a className="rounded-md bg-[#ce1d2c] px-5 py-3 font-extrabold uppercase tracking-wide hover:bg-[#e02638]" href="#calendar">Book a session</a>
          </nav>
          <button className="rounded-md border border-white/20 p-2 md:hidden" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle navigation">{mobileMenu ? <X /> : <Menu />}</button>
        </div>
        {mobileMenu && <nav className="grid gap-1 border-t border-white/10 px-4 py-4 text-sm font-semibold md:hidden"><a className="rounded px-3 py-3 hover:bg-white/10" href="#services">Programs</a><a className="rounded px-3 py-3 hover:bg-white/10" href="#calendar">Calendar</a><a className="rounded px-3 py-3 hover:bg-white/10" href="#contact">Contact</a></nav>}
      </header>

      <section className="border-b border-black/10 bg-[#111] text-white"><div className="mx-auto grid max-w-[1480px] gap-7 px-4 py-8 sm:px-7 lg:grid-cols-[1fr_auto] lg:items-end lg:py-12">
        <div><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[.18em] text-white/70"><Sparkles className="size-3.5 text-[#ce1d2c]" /> Train with purpose</div><h1 className="max-w-3xl text-4xl font-black uppercase leading-[.95] tracking-[-.04em] sm:text-6xl">Schedule your<br/><span className="text-[#ce1d2c]">training session.</span></h1><p className="mt-5 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">Pick a program, choose a time, and reserve your place. The calendar shows current availability in Eastern Time.</p></div>
        <div className="flex flex-wrap gap-3 text-sm text-white/75"><span className="inline-flex items-center gap-2 rounded-md bg-white/7 px-4 py-3"><Phone className="size-4 text-[#ce1d2c]" /> (813) 458-5324</span><span className="inline-flex items-center gap-2 rounded-md bg-white/7 px-4 py-3"><Phone className="size-4 text-[#ce1d2c]" /> (813) 750-9062</span></div>
      </div></section>

      <section id="services" className="mx-auto max-w-[1480px] px-4 py-7 sm:px-7"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {services.map((service) => { const Icon = service.icon; return <button key={service.key} onClick={() => startBooking(service.key)} className={`service-card ${selectedService === service.key ? "selected" : ""}`}><span className={`service-icon ${service.tone}`}><Icon /></span><span className="min-w-0 text-left"><span className="block text-base font-extrabold">{service.name}</span><span className="mt-1 block text-xs font-bold uppercase tracking-wider text-black/45">{service.duration}</span><span className="mt-2 block text-sm leading-5 text-black/60">{service.description}</span></span></button>; })}
      </div></section>

      <section id="calendar" className="mx-auto max-w-[1480px] px-4 pb-12 sm:px-7">
        <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_24px_70px_rgba(0,0,0,.08)]">
          <div className="flex flex-col gap-4 border-b border-black/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#ce1d2c]">Booking calendar</p><h2 className="mt-1 text-2xl font-black tracking-tight">{format(month, "MMMM yyyy")}</h2></div><div className="flex items-center gap-2"><Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month"><ChevronLeft /></Button><Button variant="outline" onClick={() => { setMonth(startOfMonth(new Date())); setSelectedDate(format(new Date(), "yyyy-MM-dd")); }}>Today</Button><Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month"><ChevronRight /></Button></div></div>
          <div className="grid grid-cols-7 border-b border-black/10 bg-[#f8f8f7] text-center text-xs font-black uppercase tracking-wider text-black/45">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day) => <div className="py-3" key={day}>{day}</div>)}</div>
          <div className="grid grid-cols-7">{calendarDays.map((day) => {
            const key = format(day, "yyyy-MM-dd"); const items = events.filter((event) => eventDate(event.start_at) === key); const isSelected = key === selectedDate;
            return <button key={key} onClick={() => setSelectedDate(key)} className={`calendar-cell ${!isSameMonth(day, month) ? "outside" : ""} ${isSelected ? "active" : ""}`}><span className="day-number">{format(day, "d")}</span><span className="mt-2 hidden w-full space-y-1 sm:block">{items.slice(0, 3).map((item) => <span key={`${item.id}-${item.start_at}`} className={`event-chip ${item.service}`}><span>{timeLabel(item.start_at)}</span><span className="truncate">{serviceInfo(item.service).short}</span>{item.service === "small_group" && <span>{item.booked}/7</span>}</span>)}{items.length > 3 && <span className="block px-1 text-left text-[11px] font-bold text-black/45">+{items.length - 3} more</span>}</span>{items.length > 0 && <span className="mt-2 flex gap-1 sm:hidden">{items.slice(0, 3).map((item) => <span key={item.id} className={`size-1.5 rounded-full dot-${item.service}`} />)}</span>}</button>;
          })}</div>
          {calendarLoading && <div className="border-t border-black/10 px-6 py-4 text-sm text-black/45">Updating availability…</div>}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
          <div className="rounded-xl border border-black/10 bg-white p-5 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#ce1d2c]">Selected day</p><h3 className="mt-1 text-xl font-black">{format(new Date(`${selectedDate}T12:00:00`), "EEEE, MMMM d")}</h3></div><span className="inline-flex items-center gap-2 text-sm text-black/50"><Clock3 className="size-4" /> Eastern Time</span></div><div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {slots.map((slot) => { const at = easternIso(selectedDate, slot); const slotStart = new Date(at).getTime(); const slotEnd = slotStart + 60 * 60_000; const overlapping = dayEvents.filter((event) => new Date(event.start_at).getTime() < slotEnd && new Date(event.end_at).getTime() > slotStart); const group = overlapping.find((event) => event.service === "small_group" && new Date(event.start_at).getTime() === slotStart); const occupied = overlapping.some((event) => event.service !== "small_group" || new Date(event.start_at).getTime() !== slotStart); return <button key={slot} disabled={occupied || Boolean(group && group.booked >= 7)} onClick={() => { setSelectedTime(slot); startBooking(group ? "small_group" : selectedService, selectedDate, slot); }} className={`time-slot ${occupied || (group && group.booked >= 7) ? "unavailable" : group ? "group" : ""}`}><span className="font-extrabold">{timeLabel(at)}</span><span className="text-[11px]">{occupied ? "Booked" : group && group.booked >= 7 ? "Group full" : group ? `${7 - group.booked} group spots` : "Available"}</span></button>; })}
          </div></div>
          <aside className="rounded-xl bg-[#111] p-6 text-white"><CalendarDays className="size-7 text-[#ce1d2c]" /><h3 className="mt-5 text-xl font-black">Need a party or team block?</h3><p className="mt-3 text-sm leading-6 text-white/60">Submit your preferred time to hold it. Staff will contact you to finalize arrangements.</p><div id="contact" className="mt-5 space-y-2 text-sm font-bold"><a className="block rounded-md bg-white/7 px-4 py-3 hover:bg-white/10" href="tel:+18134585324">Call or text (813) 458-5324</a><a className="block rounded-md bg-white/7 px-4 py-3 hover:bg-white/10" href="tel:+18137509062">Call or text (813) 750-9062</a></div></aside>
        </div>
      </section>
      <footer className="border-t border-black/10 bg-white px-4 py-6 text-center text-sm text-black/45">Arcila Training · All schedule times shown in America/New_York</footer>

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}><DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-2xl"><div className="bg-[#111] px-6 py-5 text-white"><DialogHeader><DialogTitle className="text-2xl font-black">Book {serviceInfo(selectedService).name}</DialogTitle><DialogDescription className="text-white/55">{format(new Date(`${selectedDate}T12:00:00`), "EEEE, MMMM d")} · {timeLabel(easternIso(selectedDate, selectedTime))} · {serviceInfo(selectedService).duration}</DialogDescription></DialogHeader></div>
        {message?.type === "success" ? <div className="p-7 text-center"><div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-700"><ShieldCheck className="size-7" /></div><h3 className="mt-5 text-2xl font-black">{message.text}</h3><p className="mt-3 text-sm text-black/55">Reservation <b className="text-black">{message.number}</b></p><p className="mt-3 text-sm leading-6 text-black/55">A confirmation has been prepared for the contact information you provided. Keep your reservation number for reference.</p><Button className="mt-6 bg-[#ce1d2c] hover:bg-[#b71927]" onClick={() => setBookingOpen(false)}>Return to calendar</Button></div> :
        <form className="space-y-5 p-6" onSubmit={submitBooking}>{(selectedService === "birthday" || selectedService === "team_club") && <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><b>Staff confirmation required.</b> Please call or text (813) 458-5324 or (813) 750-9062 after submitting your request to finalize arrangements.</div>}{message?.type === "error" && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{message.text}</div>}
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Parent / adult full name"><Input name="adultName" autoComplete="name" required /></Field><Field label="Player full name"><Input name="playerName" required /></Field><Field label="Player age or birth year"><Input name="playerAge" required /></Field><Field label="Mobile phone"><Input name="phone" type="tel" autoComplete="tel" placeholder="(813) 555-0123" required /></Field><Field label="Email address"><Input name="email" type="email" autoComplete="email" required /></Field><Field label="Emergency contact name"><Input name="emergencyName" required /></Field><Field label="Emergency contact phone"><Input name="emergencyPhone" type="tel" required /></Field>{selectedService === "birthday" && <Field label="Estimated number of guests"><Input name="partyGuests" type="number" min="1" required /></Field>}{selectedService === "team_club" && <><Field label="Team / club name"><Input name="teamName" required /></Field><Field label="Age group"><Input name="ageGroup" placeholder="Example: U13" required /></Field><Field label="Coach / manager name"><Input name="coachName" required /></Field></>}</div>
          <Field label="Training goals or special notes"><Textarea name="notes" rows={3} /></Field><label className="flex items-start gap-3 rounded-lg bg-black/[.035] p-3 text-sm leading-5"><Checkbox name="consentSms" defaultChecked className="mt-0.5" /><span>I agree to receive booking-related text messages.</span></label><label className="flex items-start gap-3 rounded-lg bg-black/[.035] p-3 text-sm leading-5"><Checkbox name="acceptedPolicies" required className="mt-0.5" /><span>I accept Arcila Training’s scheduling, cancellation, and facility policies.</span></label><Button disabled={loading} size="lg" className="h-12 w-full bg-[#ce1d2c] text-base font-black hover:bg-[#b71927]">{loading ? "Checking availability…" : selectedService === "birthday" || selectedService === "team_club" ? "Submit request & hold time" : "Confirm reservation"}</Button>
        </form>}
      </DialogContent></Dialog>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-sm font-bold"><span>{label}</span>{children}</label>; }
