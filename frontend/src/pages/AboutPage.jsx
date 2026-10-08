import React from "react";
import GlassCard from "../components/GlassCard";
import { Users, Sparkles, Beaker, UserCheck, Search, GraduationCap, ArrowRight } from "lucide-react";

function AboutPage({ goInput }) {
  const features = [
    { icon: Users, title: "Every batch, every teacher", body: "Model batches, subjects, tuition hours, and full teacher records — availability, subjects taught, and weekly load — in one place." },
    { icon: Sparkles, title: "A solver, not a spreadsheet", body: "A constraint-satisfaction engine places every lecture, keeping teachers off back-to-back periods and inside their weekly hours." },
    { icon: Beaker, title: "Labs handled properly", body: "Lab sessions reserve a contiguous block of periods that never straddles a break, separate from single-period lectures." },
    { icon: UserCheck, title: "Cover an absence in seconds", body: "Pick the absent teacher and slot — Periodic ranks qualified, free colleagues by how little it disrupts their own day." },
    { icon: Search, title: "Ask who's free, right now", body: "Look up any teacher or batch by day and period to see open slots before you book anything." },
    { icon: GraduationCap, title: "Built for real timetables", body: "Two outputs from one generation: a clean grid per batch for students, and a clean grid per teacher for staff." },
  ];
  return (
    <div className="tg-about">
      <div className="tg-hero">
        <div className="tg-eyebrow">Timetabling, solved</div>
        <h1>Periodic</h1>
        <p>Turn batches, subjects, and teacher rosters into a conflict-free weekly timetable — for every classroom and every teacher, at once.</p>
        <button className="tg-btn tg-btn-primary" onClick={goInput}>Start building <ArrowRight size={16} /></button>
      </div>
      <div className="tg-container" style={{ paddingBottom: 96 }}>
        <div className="tg-feature-grid">
          {features.map((f, i) => (
            <GlassCard key={i}>
              <f.icon size={22} style={{ marginBottom: 14 }} />
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>{f.title}</div>
              <div className="tg-subtle" style={{ lineHeight: 1.55 }}>{f.body}</div>
            </GlassCard>
          ))}
        </div>

        <hr className="tg-divider" />

        <div className="tg-card">
          <div className="tg-section-title">How the schedule gets built</div>
          <p className="tg-section-sub">A short, honest description of the algorithm — no black box.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {[
              ["Break every subject into lecture units", "Weekly tuition hours become individual periods to place; lab subjects become contiguous multi-period blocks instead."],
              ["Place the hardest units first", "Lab blocks and the busiest teachers' lectures are scheduled before easier ones — the standard most-constrained-first heuristic."],
              ["Check every hard rule before placing", "A slot is only used if the batch is free, the teacher is free and under their weekly cap, and a lab block doesn't cross a break."],
              ["Prefer the gentlest option among what's left", "Among valid slots, Periodic avoids giving a teacher back-to-back periods or repeating a subject twice in one day."],
              ["Try again, keep the best attempt", "The whole process runs dozens of times with different orderings; the attempt with the fewest unplaced lectures and the fewest back-to-back clashes wins."],
            ].map(([title, body], i) => (
              <div key={i} style={{ display: "flex", gap: 14 }}>
                <div className="tg-step-num">{i + 1}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{title}</div>
                  <div className="tg-subtle" style={{ marginTop: 2 }}>{body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;
