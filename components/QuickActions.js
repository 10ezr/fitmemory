const quickMessages = [
  { text: "Did legs today - squats, deadlifts, lunges", label: "Log Leg Day" },
  {
    text: "Upper body workout - bench, rows, pull-ups",
    label: "Log Upper Body",
  },
  { text: "Ran 5km in 25 minutes", label: "Log Cardio" },
  { text: "Summarize my week", label: "Week Summary" },
  { text: "Create a workout plan for me", label: "Get Plan" },
  { text: "How am I doing with consistency?", label: "Check Progress" },
];

export default function QuickActions({ onQuickMessage }) {
  return (
    <div className="p-4 border-t">
      <div className="flex flex-wrap gap-2">
        {quickMessages.map((item, index) => (
          <button
            key={index}
            onClick={() => onQuickMessage(item.text)}
            className="px-3 py-2 text-sm font-medium rounded-full border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
