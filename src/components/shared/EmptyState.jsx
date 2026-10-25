import React from 'react';

export default function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/60 px-6 py-14 text-center">
      {Icon && (
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-lavender text-indigo-700">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <h3 className="font-display text-xl font-bold">{title}</h3>
      {text && <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}