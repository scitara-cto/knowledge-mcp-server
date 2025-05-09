import { microsoftGraphApiCall } from "./msGraphActions.js";

export interface OneDriveFileMetadata {
  id: string;
  name: string;
  size: number;
  webUrl: string;
  lastModifiedDateTime: string;
}

export interface OneDriveFileMeta {
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  lastModified: string;
}

/**
 * Download a OneDrive file as a buffer.
 */
export async function retrieveOnedriveFileBuffer(
  userEmail: string,
  fileId: string,
): Promise<Buffer> {
  return await microsoftGraphApiCall(
    userEmail,
    `/me/drive/items/${fileId}/content`,
    { responseType: "buffer" },
  );
}

/**
 * Fetch OneDrive file metadata.
 */
export async function getOnedriveFileMetadata(
  userEmail: string,
  fileId: string,
): Promise<OneDriveFileMetadata> {
  return await microsoftGraphApiCall(userEmail, `/me/drive/items/${fileId}`, {
    responseType: "json",
  });
}

/**
 * Recursively enumerate all files under a OneDrive path for a user.
 * @param userEmail The user's email (for token lookup)
 * @param onedrivePath The OneDrive folder path (e.g. "/Documents/Project")
 * @returns Array of file metadata objects
 */
export async function onedriveListFilesRecursive(
  userEmail: string,
  onedrivePath: string,
): Promise<OneDriveFileMeta[]> {
  // Helper to recursively list files
  async function listFiles(
    folderPath: string,
    parentPath: string,
  ): Promise<OneDriveFileMeta[]> {
    // Microsoft Graph API: /me/drive/root:{path}:/children
    const encodedPath =
      folderPath === "/" ? "/" : encodeURIComponent(folderPath);
    const endpoint = `/me/drive/root:${encodedPath}:/children`;
    const data = await microsoftGraphApiCall(userEmail, endpoint, {
      responseType: "json",
    });
    const files: OneDriveFileMeta[] = [];
    for (const item of data.value) {
      const itemPath =
        parentPath === "/" ? `/${item.name}` : `${parentPath}/${item.name}`;
      if (item.folder) {
        // Recurse into subfolder
        const subFiles = await listFiles(itemPath, itemPath);
        files.push(...subFiles);
      } else if (item.file) {
        files.push({
          id: item.id,
          name: item.name,
          path: itemPath,
          size: item.size,
          mimeType: item.file.mimeType,
          lastModified: item.lastModifiedDateTime,
        });
      }
    }
    return files;
  }

  // Start recursion from the given path
  return await listFiles(
    onedrivePath,
    onedrivePath === "/" ? "" : onedrivePath,
  );
}
