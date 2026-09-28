"use client";

import { theme } from "@silver-fox/config";
import { estimateOneRepMax } from "@silver-fox/domain";
import { Button, Card, StatNumber } from "@silver-fox/ui";
import { useState } from "react";

const DEMO_WEIGHT_KG = 100;
const DEMO_REPS = 5;

export default function Home() {
  const [tapCount, setTapCount] = useState(0);
  const estimatedOneRepMax = Math.round(estimateOneRepMax(DEMO_WEIGHT_KG, DEMO_REPS));

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: theme.spacing.xxl,
        fontFamily: theme.typography.fontFamily.web,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: theme.typography.typeScale.display.fontSize,
              lineHeight: `${theme.typography.typeScale.display.lineHeight}px`,
              fontWeight: theme.typography.typeScale.display.fontWeight,
              color: theme.color.textPrimary,
              margin: 0,
            }}
          >
            PrimeForm
          </h1>
          <p
            style={{
              fontSize: theme.typography.typeScale.body.fontSize,
              color: theme.color.textSecondary,
              marginTop: theme.spacing.xs,
            }}
          >
            Training that adapts as you do.
          </p>
        </div>

        <Card elevated>
          <StatNumber value={`${estimatedOneRepMax} kg`} label="Estimated 1RM" />
          <p
            style={{
              fontSize: theme.typography.typeScale.caption.fontSize,
              color: theme.color.textTertiary,
              marginTop: theme.spacing.md,
            }}
          >
            {DEMO_WEIGHT_KG} kg × {DEMO_REPS} reps, from @silver-fox/domain
          </p>
        </Card>

        <Card>
          <h3
            style={{
              fontSize: theme.typography.typeScale.h3.fontSize,
              fontWeight: theme.typography.typeScale.h3.fontWeight,
              color: theme.color.textPrimary,
              margin: 0,
              marginBottom: theme.spacing.md,
            }}
          >
            Design system demo
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.md }}>
            <Button label={`Tapped ${tapCount} times`} onPress={() => setTapCount((n) => n + 1)} />
            <Button label="Secondary action" variant="secondary" onPress={() => setTapCount(0)} />
          </div>
        </Card>
      </div>
    </main>
  );
}
