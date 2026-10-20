
import { useEffect, useState } from 'react';

type ExtractedField = {
  id: string;
  fieldName: string;
  rawValue: string;
  normalizedValue: string | null;
  pageNumber: number | null;
  extractionMethod: string | null;
};

type DocumentRecord = {
  id: string;
  originalFilename: string;
  processingStatus: string;
};

type DocumentDetails = DocumentRecord & {
  extractedFields: ExtractedField[];
};

const API = 'http://localhost:3000';

export default function Documents() {
  const [files, setFiles] = useState<File[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDocument, setSelectedDocument] =
    useState<DocumentDetails | null>(null);

  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  async function loadDocuments() {
    try {
      const response = await fetch(`${API}/documents`);

      if (!response.ok) {
        throw new Error('Failed to load documents');
      }

      const data: DocumentRecord[] = await response.json();
      setDocuments(data);
    } catch {
      setMessage('Cannot connect to the backend');
    }
  }

  useEffect(() => {
    void loadDocuments();
  }, []);

  async function uploadFiles() {
    setUploading(true);
    setMessage('');

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(
          `${API}/documents/upload`,
          {
            method: 'POST',
            body: formData,
          },
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            typeof result.message === 'string'
              ? result.message
              : 'Upload failed',
          );
        }
      }

      setMessage('PDF upload completed successfully');
      setFiles([]);
      await loadDocuments();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Upload failed',
      );
      await loadDocuments();
    } finally {
      setUploading(false);
    }
  }

  async function viewFields(id: string) {
    setLoadingDetails(true);
    setSelectedDocument(null);
    setMessage('');

    try {
      const response = await fetch(
        `${API}/documents/${id}`,
      );

      if (!response.ok) {
        throw new Error('Failed to retrieve document fields');
      }

      const data: DocumentDetails = await response.json();
      setSelectedDocument(data);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load extracted fields',
      );
    } finally {
      setLoadingDetails(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: '40px auto',
        padding: 20,
      }}
    >
      <h1>Document Management</h1>

      <p>
        Upload synthetic technical PDFs and inspect
        extracted engineering information.
      </p>

      <section>
        <h2>Upload Documents</h2>

        <input
          type="file"
          accept="application/pdf,.pdf"
          multiple
          onChange={(event) =>
            setFiles(
              Array.from(event.target.files ?? []),
            )
          }
        />

        <button
          onClick={uploadFiles}
          disabled={uploading || files.length === 0}
          style={{
            marginLeft: 12,
            padding: '10px 16px',
          }}
        >
          {uploading ? 'Uploading...' : 'Upload PDFs'}
        </button>

        {message && <p role="status">{message}</p>}
      </section>

      <section style={{ marginTop: 30 }}>
        <h2>Uploaded Documents</h2>

        {documents.length === 0 ? (
          <p>No documents uploaded yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              width="100%"
              cellPadding={12}
              border={1}
            >
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {documents.map((document) => (
                  <tr key={document.id}>
                    <td>{document.originalFilename}</td>
                    <td>{document.processingStatus}</td>
                    <td>
                      <button
                        onClick={() =>
                          void viewFields(document.id)
                        }
                        disabled={loadingDetails}
                      >
                        View Fields
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ marginTop: 35 }}>
        {loadingDetails && <p>Loading fields...</p>}

        {selectedDocument && (
          <>
            <h2>
              Extracted Fields —{' '}
              {selectedDocument.originalFilename}
            </h2>

            <p>
              Processing status:{' '}
              <strong>
                {selectedDocument.processingStatus}
              </strong>
            </p>

            {selectedDocument.extractedFields.length === 0 ? (
              <p>
                No structured fields were extracted.
                Manual review may be required.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  width="100%"
                  cellPadding={12}
                  border={1}
                >
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th>Raw Value</th>
                      <th>Normalized Value</th>
                      <th>Page</th>
                      <th>Method</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedDocument.extractedFields.map(
                      (field) => (
                        <tr key={field.id}>
                          <td>{field.fieldName}</td>
                          <td>{field.rawValue}</td>
                          <td>
                            {field.normalizedValue ?? '—'}
                          </td>
                          <td>
                            {field.pageNumber ?? '—'}
                          </td>
                          <td>
                            {field.extractionMethod ?? '—'}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
