import { useState } from "react";

import { AdminWorkspace } from "@/app/admin-workspace";
import { MODULE_REGISTRY } from "@/app/module-registry";
import { PosWorkspace } from "@/app/pos-workspace";
import { useFeatureFlagsStore } from "@/modules/feature-flags";
import { SettingsModal, useSettingsStore } from "@/modules/settings";
import { UpdateToast, useUpdater } from "@/modules/updater";
import { useMountEffect } from "@/lib/use-mount-effect";

const APP_WORKSPACE = {
  POS: "pos",
  ADMIN: "admin",
} as const;

type AppWorkspace = (typeof APP_WORKSPACE)[keyof typeof APP_WORKSPACE];

export function App() {
  useSettingsStore();

  const [workspace, setWorkspace] = useState<AppWorkspace>(APP_WORKSPACE.POS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { flags } = useFeatureFlagsStore();
  const updater = useUpdater();

  useMountEffect(() => {
    if (flags.auto_update_enabled) {
      updater.checkForUpdates();
    }
  });

  return (
    <>
      {workspace === APP_WORKSPACE.POS ? (
        <PosWorkspace
          onOpenAdmin={() => setWorkspace(APP_WORKSPACE.ADMIN)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      ) : (
        <AdminWorkspace
          registry={MODULE_REGISTRY}
          onOpenPos={() => setWorkspace(APP_WORKSPACE.POS)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {isSettingsOpen ? (
        <SettingsModal
          open={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          registry={MODULE_REGISTRY}
        />
      ) : null}

      <UpdateToast updater={updater} />
    </>
  );
}
