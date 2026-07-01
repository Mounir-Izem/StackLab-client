import * as FileSystem from 'expo-file-system';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { Platform, Share } from 'react-native';

export function buildEncryptedBackupFilename(isoDate: string): string {
    const date = new Date(isoDate);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `stacklab-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}h${pad(date.getMinutes())}.stacklab`;
}

export async function writeAndShareExport(content: string, filename: string): Promise<void> {
    if (Platform.OS === 'android') {
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permissions.granted) throw new Error('EXPORT_CANCELLED');

        const fileUri = await StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            filename,
            'application/octet-stream'
        );
        await StorageAccessFramework.writeAsStringAsync(fileUri, content);
    } else {
        const file = new FileSystem.File(FileSystem.Paths.document, filename);
        file.write(content);
        await Share.share({ url: file.uri });
    }
}

const AUTO_BACKUP_FILENAME = 'stacklab-autobackup.stacklab';

export async function writeAutoBackup(content: string): Promise<void> {
    const tempFile = new FileSystem.File(FileSystem.Paths.document, `${AUTO_BACKUP_FILENAME}.tmp`);
    tempFile.write(content);

    const finalFile = new FileSystem.File(FileSystem.Paths.document, AUTO_BACKUP_FILENAME);
    if (finalFile.exists) finalFile.delete();
    tempFile.move(finalFile);
}

export async function readAutoBackup(): Promise<string | null> {
    const file = new FileSystem.File(FileSystem.Paths.document, AUTO_BACKUP_FILENAME);
    if (!file.exists) return null;
    return file.text();
}

export async function shareAutoBackupForDebug(): Promise<boolean> {
    const file = new FileSystem.File(FileSystem.Paths.document, AUTO_BACKUP_FILENAME);
    if (!file.exists) return false;
    await Share.share({ url: file.uri });
    return true;
}

export async function deleteAutoBackup(): Promise<boolean> {
    const file = new FileSystem.File(FileSystem.Paths.document, AUTO_BACKUP_FILENAME);
    if (!file.exists) return false;
    file.delete();
    return true;
}

// Returns raw file content string — format detection happens in the caller via detectBackupFormat.
export async function pickImportFile(): Promise<string | null> {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
    if (result.canceled) return null;

    const file = new FileSystem.File(result.assets[0].uri);
    return file.text();
}
