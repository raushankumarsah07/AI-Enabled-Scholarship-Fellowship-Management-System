import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Table, Spinner, Modal, Alert, Form } from 'react-bootstrap';
import axiosClient from '../../api/axiosClient';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { IndianRupee, Send, ShieldCheck, Check, Clock, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';

// Officers release fellowship installments. Two-person rule: the officer who recommended
// a student cannot release that student's money. Admins can view and manage milestones.
const FellowshipPayments = () => {
  const { user } = useAuth();
  const isOfficer = user?.role === 'officer';
  const isAdmin = user?.role === 'admin';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [deletingPayment, setDeletingPayment] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [remarks, setRemarks] = useState('Released via DBT (PFMS)');
  const [releasing, setReleasing] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/disbursements');
      if (res.data.success) {
        // Filter only valid disbursements that have an active application and applicant
        const valid = (res.data.disbursements || []).filter(d => d.applicationId && d.applicationId.applicantId);
        setRows(valid);
      }
    } catch (e) {
      setErrorMsg('Failed to load payments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Same checks as the server, shown before the officer clicks
  const blockReason = (d) => {
    if (d.status === 'released') return null;
    if (!['SELECTED', 'DISBURSING'].includes(d.applicationId?.status)) return 'Applicant is not selected.';
    if (d.recommendedBy && d.recommendedBy.id === String(user?.id || user?._id)) {
      return 'You recommended this student. Another officer must release it.';
    }
    if (d.installmentNo > 1) {
      const prev = rows.find(r => r.applicationId?._id === d.applicationId?._id && r.installmentNo === d.installmentNo - 1);
      if (prev && prev.status !== 'released') return `Release installment #${d.installmentNo - 1} first.`;
      if (!d.progressReportPath) return 'Waiting for the progress report.';
    }
    return null;
  };

  const handleRelease = async () => {
    setReleasing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await axiosClient.post(`/disbursements/${selected._id}/release`, { remarks });
      if (res.data.success) {
        setSuccessMsg(`✓ ${res.data.message} ${selected.applicationId?.applicantId?.name} has been notified.`);
        setSelected(null);
        load();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to release the installment.');
      setSelected(null);
    } finally {
      setReleasing(false);
    }
  };

  const handleDeleteDisbursement = async () => {
    if (!deletingPayment) return;
    setIsDeleting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await axiosClient.delete(`/disbursements/${deletingPayment._id}`);
      if (res.data.success) {
        setSuccessMsg('Payment milestone deleted successfully.');
        setRows(prev => prev.filter(r => r._id !== deletingPayment._id));
        setDeletingPayment(null);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete payment milestone.');
      setDeletingPayment(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Container fluid className="py-4 px-lg-4">
      <Row className="gy-4">
        <Col lg={3} md={4}>
          <Sidebar />
        </Col>

        <Col lg={9} md={8}>
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <div>
              <h4 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                <IndianRupee size={24} className="text-primary" />
                <span>Fellowship Payments (DBT)</span>
              </h4>
              <p className="text-muted small mb-0">
                Installments for selected students. The officer who recommended a student cannot release that
                student's payment. From installment #2, the guide-certified progress report is required.
              </p>
            </div>
            <Button
              variant="outline-secondary"
              size="sm"
              className="d-flex align-items-center gap-1 fw-semibold"
              onClick={load}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Payments
            </Button>
          </div>

          {!isOfficer && (
            <Alert variant="light" className="py-2 small border">View only - payments are released by officers.</Alert>
          )}
          {successMsg && <Alert variant="success" className="py-2 small fw-semibold" dismissible onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}
          {errorMsg && <Alert variant="danger" className="py-2 small fw-semibold" dismissible onClose={() => setErrorMsg(null)}>{errorMsg}</Alert>}

          <Card className="gov-card p-3 border">
            {loading ? (
              <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
            ) : rows.length === 0 ? (
              <div className="text-center py-5 text-muted">No installments yet. Publish a merit list first.</div>
            ) : (
              <div className="table-responsive">
                <Table bordered hover size="sm" className="gov-table small align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Student</th>
                      <th>Installment</th>
                      <th>Amount</th>
                      <th>Due</th>
                      <th>Progress Report</th>
                      <th>Recommended By</th>
                      <th>Status</th>
                      <th style={{ width: '24%' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((d) => {
                      const reason = blockReason(d);
                      return (
                        <tr key={d._id}>
                          <td>
                            <div className="fw-bold text-dark">{d.applicationId?.applicantId?.name || '-'}</div>
                            <div className="small text-muted">{d.applicationId?.applicationNo} | {d.applicationId?.schemeId?.code}</div>
                          </td>
                          <td className="fw-bold">#{d.installmentNo}</td>
                          <td className="fw-bold text-success">₹{d.amount?.toLocaleString('en-IN')}</td>
                          <td>{new Date(d.dueDate).toLocaleDateString('en-IN')}</td>
                          <td>
                            {d.installmentNo === 1 ? (
                              <span className="text-muted">Not required</span>
                            ) : d.progressReportPath ? (
                              <Badge bg="success"><Check size={12} className="me-1" />Certified</Badge>
                            ) : (
                              <Badge bg="warning" text="dark"><Clock size={12} className="me-1" />Pending</Badge>
                            )}
                          </td>
                          <td>{d.recommendedBy?.name || <span className="text-muted">-</span>}</td>
                          <td>
                            {d.status === 'released' ? (
                              <>
                                <Badge bg="success">Released</Badge>
                                {d.transactionId && <div><code className="small">{d.transactionId}</code></div>}
                              </>
                            ) : (
                              <Badge bg="secondary">{d.status.toUpperCase()}</Badge>
                            )}
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-1.5 flex-wrap">
                              {d.status === 'released' ? (
                                <span className="text-success small fw-semibold">Paid</span>
                              ) : isOfficer ? (
                                <div>
                                  <Button
                                    size="sm"
                                    variant="success"
                                    className="fw-bold d-inline-flex align-items-center gap-1"
                                    disabled={Boolean(reason)}
                                    title={reason || ''}
                                    onClick={() => { setSelected(d); setRemarks('Released via DBT (PFMS)'); }}
                                  >
                                    <Send size={13} /> Release
                                  </Button>
                                  {reason && <div className="small text-muted mt-1">⚠ {reason}</div>}
                                </div>
                              ) : (
                                <span className="text-muted small">View only</span>
                              )}

                              {(isAdmin || isOfficer) && (
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  className="d-inline-flex align-items-center p-1"
                                  onClick={() => setDeletingPayment(d)}
                                  title="Delete Payment Milestone"
                                >
                                  <Trash2 size={13} />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            )}
          </Card>

          {/* Release Modal */}
          <Modal show={Boolean(selected)} onHide={() => setSelected(null)} centered>
            <Modal.Header closeButton className="bg-light">
              <Modal.Title className="fs-6 fw-bold d-flex align-items-center gap-2">
                <ShieldCheck size={18} className="text-success" /> Release Installment
              </Modal.Title>
            </Modal.Header>
            <Modal.Body className="small">
              <p className="mb-2">
                Release installment <strong>#{selected?.installmentNo}</strong> of{' '}
                <strong>₹{selected?.amount?.toLocaleString('en-IN')}</strong> to{' '}
                <strong>{selected?.applicationId?.applicantId?.name}</strong> by Direct Benefit Transfer?
              </p>
              <Form.Group>
                <Form.Label className="fw-semibold">Remark</Form.Label>
                <Form.Control value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="outline-secondary" size="sm" onClick={() => setSelected(null)}>Cancel</Button>
              <Button variant="success" size="sm" className="fw-bold" onClick={handleRelease} disabled={releasing || !remarks.trim()}>
                {releasing ? <Spinner size="sm" animation="border" /> : 'Release'}
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Delete Payment Modal */}
          <Modal show={Boolean(deletingPayment)} onHide={() => setDeletingPayment(null)} centered>
            <Modal.Header closeButton className="bg-light">
              <Modal.Title className="fs-6 fw-bold text-danger d-flex align-items-center gap-2">
                <AlertTriangle size={18} /> Confirm Delete Payment Milestone
              </Modal.Title>
            </Modal.Header>
            <Modal.Body className="small">
              <p className="mb-2">
                Are you sure you want to delete installment <strong>#{deletingPayment?.installmentNo}</strong> (₹{deletingPayment?.amount?.toLocaleString('en-IN')}) for student <strong>{deletingPayment?.applicationId?.applicantId?.name || 'this student'}</strong>?
              </p>
              <div className="alert alert-danger py-2 small mb-0">
                This record will be permanently deleted from the database.
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="outline-secondary" size="sm" onClick={() => setDeletingPayment(null)} disabled={isDeleting}>Cancel</Button>
              <Button variant="danger" size="sm" className="fw-bold d-inline-flex align-items-center gap-1" onClick={handleDeleteDisbursement} disabled={isDeleting}>
                {isDeleting ? <Spinner size="sm" animation="border" /> : <Trash2 size={13} />}
                <span>Delete</span>
              </Button>
            </Modal.Footer>
          </Modal>
        </Col>
      </Row>
    </Container>
  );
};

export default FellowshipPayments;

