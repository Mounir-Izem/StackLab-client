import * as FileSystem from 'expo-file-system';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { Platform, Share } from 'react-native';
import type { ExportData } from '../schemas/export.schema';

function buildBackupFilename(isoDate: string): string {
    const date = new Date(isoDate);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `stacklab-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}h${pad(date.getMinutes())}.json`;
}

export async function writeAndShareExport(data: ExportData): Promise<void> {
    const filename = buildBackupFilename(data.exported_at);
    const content = JSON.stringify(data, null, 2);

    if (Platform.OS === 'android') {
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permissions.granted) throw new Error('EXPORT_CANCELLED');

        const fileUri = await StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            filename,
            'application/json'
        );
        await StorageAccessFramework.writeAsStringAsync(fileUri, content);
    } else {
        const file = new FileSystem.File(FileSystem.Paths.document, filename);
        file.write(content);
        await Share.share({ url: file.uri });
    }
}

const AUTO_BACKUP_FILENAME = 'stacklab-autobackup.json';

export async function writeAutoBackup(data: ExportData): Promise<void> {
    const content = JSON.stringify(data, null, 2);

    const tempFile = new FileSystem.File(FileSystem.Paths.document, `${AUTO_BACKUP_FILENAME}.tmp`);
    tempFile.write(content);

    const finalFile = new FileSystem.File(FileSystem.Paths.document, AUTO_BACKUP_FILENAME);
    if (finalFile.exists) finalFile.delete();
    tempFile.move(finalFile);
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

export async function pickImportFile(): Promise<unknown | null> {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
    if (result.canceled) return null;

    const file = new FileSystem.File(result.assets[0].uri);
    const content = await file.text();
    return JSON.parse(content);
}
