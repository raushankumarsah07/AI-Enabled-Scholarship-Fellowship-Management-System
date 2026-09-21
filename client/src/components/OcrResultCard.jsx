import React, { useState } from 'react';
import { Card, ProgressBar, Alert, Badge, Table, Button, Modal, Tabs, Tab } from 'react-bootstrap';
import { FileText, CheckCircle, AlertTriangle, XCircle, Eye, Cpu, Download, ExternalLink } from 'lucide-react';

const OcrResultCard = ({ document: doc }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');

  if (!doc) return null;

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  const fileUrl = `${apiBase}/documents/${doc._id}/file`;
  const isPdf = (doc.mimeType && doc.mimeType.includes('pdf')) || (doc.originalName && doc.originalName.toLowerCase().endsWith('.pdf'));
  const isImage = (doc.mimeType && doc.mimeType.startsWith('image/')) || (doc.originalName && /\.(png|jpe?g|webp|gif)$/i.test(doc.originalName));

  const getStatusBadge = () => {
    switch (doc.verificationStatus) {
      case 'auto_ok':
        return <Badge bg="success"><CheckCircle size={12} className="me-1" /> Auto-Verified OK</Badge>;
      case 'approved':
        return <Badge bg="success"><CheckCircle size={12} className="me-1" /> Officer Approved</Badge>;
      case 'rejected':
        return <Badge bg="danger"><XCircle size={12} className="me-1" /> Rejected</Badge>;
      case 'needs_review':
      default:
        return <Badge bg="warning" text="dark"><AlertTriangle size={12} className="me-1" /> Needs Officer Review</Badge>;
    }
  };

  const formatKey = (key) => {
    if (!key) return '';
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatVal = (val) => {
    if (typeof val === 'number') {
      if (val > 1000) return `₹${val.toLocaleString('en-IN')}`;
      return `${val}%`;
    }
    return String(val);
  };

  return (
    <>
      <Card className="gov-card mb-3 border">
        <Card.Header className="d-flex justify-content-between align-items-center bg-light py-2 flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <FileText className="text-primary" size={18} />
            <strong className="text-dark fs-6">{formatKey(doc.docKey)}</strong>
            <span className="text-muted small">({doc.originalName})</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            {/* View / Preview Document Button */}
            <Button
              variant="outline-primary"
              size="sm"
              className="py-0.5 px-2.5 d-inline-flex align-items-center gap-1 fw-semibold"
              style={{ fontSize: '0.8rem' }}
              onClick={() => setShowPreview(true)}
            >
              <Eye size={13} />
              <span>View File</span>
            </Button>
            {getStatusBadge()}
          </div>
        </Card.Header>

        <Card.Body className="p-3">
          {/* OCR Confidence & Classification */}
          <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2 pb-2 border-bottom">
            <div className="d-flex align-items-center gap-2">
              <Cpu size={16} className="text-secondary" />
              <span className="small text-muted">Detected Type:</span>
              <span className="badge bg-secondary">{formatKey(doc.detectedDocType || 'unknown')}</span>
            </div>

            <div className="d-flex align-items-center gap-2" style={{ width: '220px' }}>
              <span className="small text-muted text-nowrap">OCR Confidence:</span>
              <ProgressBar
                now={doc.confidence || 0}
                variant={doc.confidence >= 80 ? 'success' : (doc.confidence >= 60 ? 'warning' : 'danger')}
                label={`${doc.confidence || 0}%`}
                className="w-100"
                style={{ height: '18px', fontSize: '0.75rem', fontWeight: 'bold' }}
              />
            </div>
          </div>

          {/* Mismatch Red Alerts */}
          {doc.mismatches && doc.mismatches.length > 0 && (
            <div className="mb-3">
              {doc.mismatches.map((m, idx) => (
                <Alert key={idx} variant={m.severity === 'critical' ? 'danger' : 'warning'} className="py-2 px-3 mb-2 small d-flex align-items-center gap-2">
                  <AlertTriangle size={18} className="flex-shrink-0" />
                  <div>
                    <strong>{m.severity === 'critical' ? 'Critical Discrepancy:' : 'Discrepancy Detected:'}</strong> {m.message}
                  </div>
                </Alert>
              ))}
            </div>
          )}

          {/* Extracted Key-Value Table */}
          <div className="mb-2">
            <div className="small fw-bold text-dark mb-1.5">AI OCR Extracted Attributes:</div>
            {doc.ocrExtracted && Object.keys(doc.ocrExtracted).length > 0 ? (
              <div className="table-responsive">
                <Table size="sm" bordered className="mb-0 bg-light small">
                  <tbody>
                    {Object.entries(doc.ocrExtracted).map(([k, v]) => {
                      if (v === null || v === undefined || v === '') return null;
                      return (
                        <tr key={k}>
                          <td className="fw-semibold text-muted text-nowrap" style={{ width: '35%' }}>
                            {formatKey(k)}
                          </td>
                          <td className="fw-bold text-dark">
                            {formatVal(v)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            ) : (
              <div className="text-muted small fst-italic">No structured attributes extracted.</div>
            )}
          </div>

          {/* Officer Remark if present */}
          {doc.officerRemark && (
            <div className="mt-2 pt-2 border-top small text-secondary">
              <strong>Officer Feedback:</strong> <em>"{doc.officerRemark}"</em>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Interactive Document Viewer Modal */}
      <Modal show={showPreview} onHide={() => setShowPreview(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="fs-6 fw-bold d-flex align-items-center gap-2 text-dark">
            <FileText size={18} className="text-primary" />
            <span>Document Preview: {formatKey(doc.docKey)} ({doc.originalName})</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="border-bottom px-3 pt-2 bg-light">
            <Tab eventKey="preview" title="📄 Original Document File">
              <div className="p-3 bg-dark bg-opacity-10 text-center" style={{ minHeight: '380px' }}>
                {isPdf ? (
                  <iframe
                    src={fileUrl}
                    title={doc.originalName}
                    width="100%"
                    height="500px"
                    className="border rounded bg-white shadow-sm"
                  />
                ) : isImage ? (
                  <div className="d-flex justify-content-center align-items-center p-2">
                    <img
                      src={fileUrl}
                      alt={doc.originalName}
                      className="img-fluid rounded shadow-sm border bg-white"
                      style={{ maxHeight: '500px', objectFit: 'contain' }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.parentNode.innerHTML = '<div class="alert alert-warning">Image could not be rendered inline. Please use the direct download or open button below.</div>';
                      }}
                    />
                  </div>
                ) : (
                  <div className="p-4 bg-white rounded border text-start">
                    <h6 className="fw-bold text-dark border-bottom pb-2">Document Transcript Preview:</h6>
                    <pre className="p-3 bg-light rounded text-dark small" style={{ maxHeight: '400px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                      {doc.ocrRawText || 'Official Government Certificate File on record.'}
                    </pre>
                  </div>
                )}
              </div>
            </Tab>
            <Tab eventKey="ocr" title="🤖 AI OCR Transcript">
              <div className="p-3">
                <h6 className="fw-bold text-dark mb-2">Raw OCR Text Output:</h6>
                <div className="p-3 bg-light rounded border text-dark font-monospace small" style={{ maxHeight: '350px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                  {doc.ocrRawText || 'No raw text available.'}
                </div>
              </div>
            </Tab>
          </Tabs>
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between bg-light py-2">
          <div className="small text-muted">
            Detected: <strong>{formatKey(doc.detectedDocType || 'unknown')}</strong> | Confidence: <strong>{doc.confidence || 0}%</strong>
          </div>
          <div className="d-flex gap-2">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
            >
              <ExternalLink size={13} /> Open in New Tab
            </a>
            <a
              href={fileUrl}
              download={doc.originalName}
              className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1"
              style={{ backgroundColor: '#0B2545', borderColor: '#0B2545' }}
            >
              <Download size={13} /> Download File
            </a>
          </div>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default OcrResultCard;
