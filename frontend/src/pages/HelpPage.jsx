import React from "react";
import Accordion from "../components/Accordion";
import SubstituteFinder from "../components/SubstituteFinder";

function HelpPage({ config, schedule }) {
  return (
    <div className="tg-container" style={{ padding: "40px 24px 96px", maxWidth: 820 }}>
      <div className="tg-section-title">Help</div>
      <div className="tg-section-sub">Answers to the questions administrators ask most, plus a couple of built-in tools.</div>

      <div className="tg-card" style={{ marginBottom: 24 }}>
        <Accordion title="A teacher is absent — who can cover their lecture?" defaultOpen>
          <SubstituteFinder config={config} schedule={schedule} />
        </Accordion>
      </div>

      <div className="tg-card">
        <Accordion title="How do I check if a teacher or batch is free at a given time?">
          Go to <strong>Timetables → Availability Explorer</strong>. Choose whether you're checking a teacher or a batch, then a day and period — it tells you immediately whether they're free, and shows their whole week for context.
        </Accordion>
        <Accordion title="Why did some lectures not get placed?">
          The Timetables page flags any lecture the solver couldn't place without breaking a rule — usually because a teacher's weekly hours are too tight for how many subjects they're assigned, or a lab block genuinely has nowhere contiguous left to go. Try raising that teacher's weekly hour cap, assigning a second qualified teacher to the subject, or adding a period to the day.
        </Accordion>
        <Accordion title="Can a day have shorter hours, like a half day on Saturday?">
          Yes — in Set Up → Schedule Settings, under "Day-specific hours", tick any day and give it its own, shorter period count. The solver treats that day as genuinely ending earlier: it won't place lectures past that day's last period, and any break that would fall after it (like a lunch break on a morning-only Saturday) is skipped automatically rather than shown as an error.
        </Accordion>
        <Accordion title="How long is a lab session, exactly?">
          By default a lab reserves {config.labBlockSize} periods back to back (about {config.labBlockSize * config.periodDuration} minutes at your current period length) — long enough for setup and a full experiment. You can set a different block length per subject in Set Up → Batches & Subjects, and the solver guarantees the block never gets split by a break.
        </Accordion>
        <Accordion title="How do sub-batches (S1, S2, S3…) work?">
          Some classes split into smaller lab groups called S1, S2, S3 and so on. In Set Up → Batches & Subjects, tick "divided into sub-batches", say how many, then mark each lab subject as "For S1", "For S2"… Every sub-batch gets its own labs, its own teachers and its own weekly hours (add the same lab twice if two teachers share it, like DSAL). Different sub-batches can have labs at the same time, but a whole-class lecture only goes where every sub-batch is free. On the Timetables page you can view the whole class or a single sub-batch.
        </Accordion>
        <Accordion title="Can I avoid free periods in the middle of the day?">
          Yes — in Set Up → Schedule Settings, tick "No free periods". The solver then keeps each class's day packed from the first period, with no gaps in the middle (finishing early is fine). It's a strong preference rather than an absolute rule: if your teachers' hours make it impossible, the Timetables page tells you exactly how many gaps remain instead of failing. You can also tick "Labs only after lunch" to get fixed lab blocks like periods 5–6 and 7–8.
        </Accordion>
        <Accordion title="How do I get a printable timetable?">
          After generating, click "Printable format" on the Timetables page. It lays out the grid the way a notice-board timetable looks (lab blocks merged, lunch column), plus the S1–S4 batches, faculty and subject short/long forms, and three blank signature lines. Fill in the department, class teacher and date, then press "Print / Save as PDF".
        </Accordion>
        <Accordion title="How can I tell labs apart from regular lectures at a glance?">
          Every lab cell has a blue "Lab" tag and a blue left edge, distinct from the plain grey of a regular lecture. Rotation slots go further — a light blue "Lab rotation" card listing each sub-batch's subject with its own colored dot. A legend above every timetable spells out what each style means.
        </Accordion>
        <Accordion title="How does the solver avoid back-to-back lectures for teachers?">
          Every time it considers a slot, it checks whether the period right before or after is already taken by the same teacher, and treats that as a real but soft cost — it's avoided whenever a clash-free alternative exists, and only accepted when there truly is no other legal slot left. The Timetables page reports how many such instances remain.
        </Accordion>
        <Accordion title="Can one subject have more than one qualified teacher?">
          Yes — add the same subject name under more than one teacher's profile, each with its own weekly hours. When you assign that subject to a batch, the Teacher dropdown will list every qualified teacher to choose from, and that same list is what the substitute finder searches when someone's absent.
        </Accordion>
        <Accordion title="A teacher covers several subjects — how do I set that up?">
          Under Set Up → Teachers, add one row per subject they teach, each with its own weekly hours and, if it's a lab, its own block length. That's the only place you'll ever type a subject name — when you build out batches, you just pick the subject and then the teacher, and the hours and lab settings fill in automatically.
        </Accordion>
        <Accordion title="What counts toward a teacher's weekly hours?">
          Every period they're scheduled to teach, across every batch and subject, including lab blocks and every sub-batch rotation they take. The cap you set per teacher in Set Up → Teachers is a hard limit the solver will not exceed, no matter how many subjects they're assigned.
        </Accordion>
        <Accordion title="How do the email reminders work?">
          Add each teacher's email in Set Up → Teachers (it's optional). After generating a timetable, open the "Email reminders" card at the bottom of the Timetables page and press "Turn on reminders". Ten minutes before each lecture or lab, that teacher gets an email with the class, subject, day, time and duration. Two things are required: the backend must be running continuously (sending is done by the Python backend, not your browser), and your email account's SMTP settings must be set — see backend/.env.example. Use "Send test" to check it works before relying on it.
        </Accordion>
      </div>
    </div>
  );
}

export default HelpPage;
