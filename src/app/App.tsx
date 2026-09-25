import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AdminWorkspace } from "@/app/admin-workspace";
import { MODULE_REGISTRY } from "@/app/module-registry";
import { PosWorkspace } from "@/app/pos-workspace";
import { useSettingsWindowBridge } from "@/settings/use-settings-bridge";
import { openSettingsWindow, useSettingsStore } from "@/modules/settings";

const APP_WORKSPACE = {
  POS: "pos",
  ADMIN: "admin",
} as const;

type AppWorkspace = (typeof APP_WORKSPACE)[keyof typeof APP_WORKSPACE];

export function App() {
  useSettingsStore();

  const [workspace, setWorkspace] = useState<AppWorkspace>(APP_WORKSPACE.POS);
  const { t } = useTranslation("settings");
  const waitForSettingsWindowBridge = useSettingsWindowBridge();

  async function handleOpenSettings() {
    try {
      await waitForSettingsWindowBridge();
      await openSettingsWindow();
    } catch (error) {
      console.error("Could not open Settings window", error);
      toast.error(t("window.openError"));
    }
  }

  return (
    <>
      {workspace === APP_WORKSPACE.POS ? (
        <PosWorkspace
          onOpenAdmin={() => setWorkspace(APP_WORKSPACE.ADMIN)}
          onOpenSettings={handleOpenSettings}
        />
      ) : (
        <AdminWorkspace
          registry={MODULE_REGISTRY}
          onOpenPos={() => setWorkspace(APP_WORKSPACE.POS)}
          onOpenSettings={handleOpenSettings}
        />
      )}
    </>
  );
}
