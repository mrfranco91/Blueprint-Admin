import React, { useState } from 'react';

const PlanEditor = ({ plan }) => {
  const [loading, setLoading] = useState(false);

  return (
    <div className="p-4 text-sm text-muted-foreground">
      Visual editor temporarily disabled.
    </div>
  );
};

export default PlanEditor;
