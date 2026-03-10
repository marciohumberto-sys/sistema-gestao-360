import { supabase } from '../../lib/supabase';

class FilesService {
    /**
     * Upload an array buffer to Supabase Storage
     * @param file {File | Blob} The file to upload
     * @param bucketName {string} Storage bucket name
     * @param path {string} Path including filename
     * @returns object with { publicUrl, error }
     */
    async uploadFile(file: File | Blob, bucketName: string, path: string): Promise<{ publicUrl: string | null; error: Error | null }> {
        try {
            const { data, error } = await supabase.storage
                .from(bucketName)
                .upload(path, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (error) {
                console.error('Storage upload error:', error);
                return { publicUrl: null, error };
            }

            const { data: publicUrlData } = supabase.storage
                .from(bucketName)
                .getPublicUrl(path);

            return { publicUrl: publicUrlData.publicUrl, error: null };
        } catch (error: any) {
            console.error('Upload exception:', error);
            return { publicUrl: null, error };
        }
    }
}

export const filesService = new FilesService();
