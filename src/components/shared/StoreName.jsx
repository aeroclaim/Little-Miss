import React from 'react';

export default function StoreName({ store }) {
  if (!store) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="font-medium">
      {store.name}
      <span className="ms-2 text-xs font-normal text-muted-foreground">{store.town}</span>
    </span>
  );
}