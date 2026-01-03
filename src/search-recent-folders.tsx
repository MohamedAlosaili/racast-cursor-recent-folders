import {
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
  LocalStorage,
  Form,
  useNavigation,
  closeMainWindow,
} from "@raycast/api";
import { executeSQL } from "@raycast/utils";
import { useState, useEffect } from "react";
import { homedir, platform } from "os";
import { existsSync } from "fs";
import { basename } from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const STORAGE_PATH_KEY = "cursor-storage-path";

interface Folder {
  name: string;
  path: string;
  timestamp?: number;
}

interface RecentEntry {
  folderUri?: string;
  workspace?: {
    configPath?: string;
  };
  label?: string;
  remoteAuthority?: string;
}

function getDefaultStoragePath(): string {
  const os = platform();
  const home = homedir();

  switch (os) {
    case "darwin": // macOS
      return `${home}/Library/Application Support/Cursor/User/globalStorage/state.vscdb`;
    case "win32": // Windows
      return `${process.env.APPDATA}\\Cursor\\User\\globalStorage\\state.vscdb`;
    case "linux":
      return `${home}/.config/Cursor/User/globalStorage/state.vscdb`;
    default:
      return `${home}/Library/Application Support/Cursor/User/globalStorage/state.vscdb`;
  }
}

function ConfigureStoragePath({ onSave }: { onSave: () => void }) {
  const { pop } = useNavigation();
  const [currentPath, setCurrentPath] = useState<string>("");

  useEffect(() => {
    loadCurrentPath();
  }, []);

  async function loadCurrentPath() {
    const saved = await LocalStorage.getItem<string>(STORAGE_PATH_KEY);
    setCurrentPath(saved || getDefaultStoragePath());
  }

  async function handleSubmit(values: { storagePath: string }) {
    try {
      const path = values.storagePath.trim();

      if (!path) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Storage path is required",
        });
        return;
      }

      // Expand ~ to home directory for validation
      let expandedPath = path;
      if (expandedPath.startsWith("~")) {
        expandedPath = expandedPath.replace("~", homedir());
      }

      // Check if path exists
      if (!existsSync(expandedPath)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Path does not exist",
          message: expandedPath,
        });
        return;
      }

      await LocalStorage.setItem(STORAGE_PATH_KEY, path);
      await showToast({
        style: Toast.Style.Success,
        title: "Storage path saved",
        message: path,
      });
      onSave();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save path",
        message: String(error),
      });
    }
  }

  async function handleUseDefault() {
    try {
      const defaultPath = getDefaultStoragePath();

      if (!existsSync(defaultPath)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Default path not found",
          message: defaultPath,
        });
        return;
      }

      await LocalStorage.setItem(STORAGE_PATH_KEY, defaultPath);
      await showToast({
        style: Toast.Style.Success,
        title: "Using default path",
      });
      onSave();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to set default",
        message: String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Path" onSubmit={handleSubmit} />
          <Action title="Use Default Path" onAction={handleUseDefault} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="storagePath"
        title="Storage Path"
        placeholder={getDefaultStoragePath()}
        defaultValue={currentPath}
        info="Path to Cursor's state.vscdb SQLite database. Use ~ for home directory."
      />
      <Form.Description title="Platform" text={`Detected: ${platform()}`} />
    </Form>
  );
}

export default function Command() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const { push } = useNavigation();

  useEffect(() => {
    checkConfiguration();
  }, []);

  async function checkConfiguration() {
    const storagePath = await LocalStorage.getItem<string>(STORAGE_PATH_KEY);

    if (!storagePath || storagePath.trim() === "") {
      // Check if default path exists
      const defaultPath = getDefaultStoragePath();
      if (existsSync(defaultPath)) {
        // Auto-configure with default path
        await LocalStorage.setItem(STORAGE_PATH_KEY, defaultPath);
        setIsConfigured(true);
        await loadRecentFolders();
      } else {
        setIsConfigured(false);
        setIsLoading(false);
      }
      return;
    }

    setIsConfigured(true);
    await loadRecentFolders();
  }

  async function loadRecentFolders() {
    setIsLoading(true);
    try {
      const recentFolders = await getRecentFolders();
      setFolders(recentFolders);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load folders",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function openInCursor(path: string) {
    try {
      // Check if folder exists first
      if (!existsSync(path)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Folder not found",
          message: path,
        });
        return;
      }

      // Open the folder in Cursor
      await execAsync(`open -a "Cursor" "${path}"`);

      // Close Raycast - this will automatically focus on Cursor
      await closeMainWindow();

      await showToast({
        style: Toast.Style.Success,
        title: "Opening folder",
        message: basename(path),
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open folder",
        message: String(error),
      });
    }
  }

  async function openConfigureForm() {
    push(<ConfigureStoragePath onSave={checkConfiguration} />);
  }

  // Show configuration screen if not configured
  if (!isConfigured && !isLoading) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Gear}
          title="Storage Path Not Configured"
          description="Cursor database not found at default location. Please configure manually."
          actions={
            <ActionPanel>
              <Action
                title="Configure Storage Path"
                icon={Icon.Gear}
                onAction={openConfigureForm}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search recent Cursor folders..."
    >
      {folders.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No Recent Folders"
          description="Open some folders in Cursor first"
          actions={
            <ActionPanel>
              <Action
                title="Configure Storage Path"
                icon={Icon.Gear}
                onAction={openConfigureForm}
              />
            </ActionPanel>
          }
        />
      ) : (
        folders.map((folder, index) => (
          <List.Item
            key={`${folder.path}-${index}`}
            title={folder.name}
            subtitle={folder.path}
            icon={Icon.Folder}
            accessories={[
              {
                text: folder.path.includes("Workspace/projects")
                  ? "~/Workspace/projects"
                  : "",
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Open in Cursor"
                  icon={Icon.Code}
                  onAction={() => openInCursor(folder.path)}
                />
                <Action.ShowInFinder path={folder.path} />
                <Action.CopyToClipboard
                  title="Copy Path"
                  content={folder.path}
                />
                <ActionPanel.Section>
                  <Action
                    title="Configure Storage Path"
                    icon={Icon.Gear}
                    onAction={openConfigureForm}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

async function getStoragePath(): Promise<string> {
  const saved = await LocalStorage.getItem<string>(STORAGE_PATH_KEY);

  if (!saved || saved.trim() === "") {
    throw new Error("Storage path not configured");
  }

  let customPath = saved.trim();
  // Expand ~ to home directory
  if (customPath.startsWith("~")) {
    customPath = customPath.replace("~", homedir());
  }

  return customPath;
}

async function getRecentFolders(): Promise<Folder[]> {
  const storagePath = await getStoragePath();

  if (!existsSync(storagePath)) {
    throw new Error(`Cursor database not found at: ${storagePath}`);
  }

  try {
    // Use Raycast's executeSQL instead of better-sqlite3
    const result = await executeSQL<{ value: string }>(
      storagePath,
      "SELECT value FROM ItemTable WHERE key = 'history.recentlyOpenedPathsList'",
    );

    if (!result || result.length === 0 || !result[0].value) {
      return [];
    }

    // Parse the JSON value
    const data = JSON.parse(result[0].value);
    const folders: Folder[] = [];

    // Extract entries
    const entries: RecentEntry[] = data.entries || [];

    for (const entry of entries) {
      let folderPath = "";

      // Skip remote workspaces
      if (entry.remoteAuthority) {
        continue;
      }

      if (entry.folderUri) {
        folderPath = entry.folderUri
          .replace("file://", "")
          .replace(/%20/g, " ")
          .replace(/%3A/g, ":");
      } else if (entry.workspace?.configPath) {
        folderPath = entry.workspace.configPath
          .replace("file://", "")
          .replace(/%20/g, " ")
          .replace(/%3A/g, ":");
        // Remove .code-workspace extension
        folderPath = folderPath.replace(/\.code-workspace$/, "");
      }

      // Decode URI components properly
      try {
        folderPath = decodeURIComponent(folderPath);
      } catch {
        // If decoding fails, use the path as-is
      }

      if (folderPath && existsSync(folderPath)) {
        folders.push({
          name: basename(folderPath),
          path: folderPath,
          timestamp: Date.now(),
        });
      }
    }

    return folders;
  } catch (error) {
    throw new Error(`Failed to read Cursor database: ${error}`);
  }
}
