import React, { useState } from 'react';

export function ExcelUpload({ onUploadSuccess }: { onUploadSuccess: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      setProgress('Preparing file...');

      // Validate file type
      if (!file.name.match(/\.(xlsx|xls)$/)) {
        throw new Error('Please select an Excel file (.xlsx or .xls)');
      }

      // Create FormData and append the file
      const formData = new FormData();
      formData.append('file', file);

      setProgress('Uploading file...');

      // Send file to backend
      const response = await fetch('http://localhost:5069/api/workorders/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = 'Failed to upload file';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (parseError) {
          try {
            errorMessage = await response.text();
          } catch (textError) {
            errorMessage = response.statusText || errorMessage;
          }
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Upload result:', result);

      // Show detailed success message
      const successMessage = `File processed successfully!\n` +
        `Total rows: ${result.totalRows}\n` +
        `Successful: ${result.successCount}\n` +
        `Failed: ${result.errorCount}`;

      if (result.errorCount > 0) {
        const errorDetails = result.errors.join('\n');
        alert(`${successMessage}\n\nErrors:\n${errorDetails}`);
      } else {
        alert(successMessage);
      }

      onUploadSuccess();
    } catch (err) {
      console.error('Error uploading excel:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload excel file');
    } finally {
      setUploading(false);
      setProgress('');
      // Reset the input
      event.target.value = '';
    }
  };

  return (
    <div className="mb-4">
      <label className="relative inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer">
        <span className="mr-2">
          {uploading ? (progress || 'Uploading...') : 'Upload Excel'}
        </span>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </label>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
} 