import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';
import { KeyRound, Mail, RefreshCw, CheckCircle2 } from 'lucide-react';

const VerifyOtp = () => {
  const [searchParams] = useSearchParams();
  const { verifyOtp } = useAuth();
  const navigate = useNavigate();

  const emailParam = searchParams.get('email') || '';
  const otpDebug = searchParams.get('otpDebug') || '';

  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState(otpDebug);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState(null);
  const [error, setError] = useState(null);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError(null);
    setResendMsg(null);
    setLoading(true);

    try {
      const data = await verifyOtp(email, otp);
      if (data.success) {
        navigate('/applicant/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP entered. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email) {
      setError('Please provide your registered email address first.');
      return;
    }

    setError(null);
    setResendMsg(null);
    setResending(true);

    try {
      const res = await axiosClient.post('/auth/resend-otp', { email });
      if (res.data.success) {
        setResendMsg('A fresh verification code has been dispatched to your email address.');
        if (res.data.otpDebug) {
          setOtp(res.data.otpDebug);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={6} lg={5}>
          <Card className="gov-card border shadow-sm p-4 text-center">
            <div
              className="rounded-circle bg-success bg-opacity-10 text-success d-inline-flex align-items-center justify-content-center p-3 mb-3 mx-auto"
              style={{ width: '64px', height: '64px' }}
            >
              <KeyRound size={32} />
            </div>

            <h4 className="fw-bold text-dark mb-1">Verify Email & Mobile OTP</h4>
            <p className="text-muted small mb-4">
              Enter the 6-digit verification code sent to <br />
              <strong className="text-primary">{email || 'your registered email'}</strong>
            </p>

            {resendMsg && (
              <Alert variant="success" className="py-2 small text-start d-flex align-items-center gap-2 mb-3">
                <CheckCircle2 size={16} />
                <span>{resendMsg}</span>
              </Alert>
            )}

            {error && (
              <Alert variant="danger" className="py-2 small text-start mb-3">
                {error}
              </Alert>
            )}

            <Form onSubmit={handleVerify}>
              <Form.Group className="mb-3 text-start">
                <Form.Label className="small fw-bold text-dark">Registered Email Address</Form.Label>
                <div className="input-group">
                  <span className="input-group-text bg-light">
                    <Mail size={16} className="text-muted" />
                  </span>
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. yourname@example.com"
                    required
                  />
                </div>
              </Form.Group>

              <Form.Group className="mb-4 text-start">
                <Form.Label className="small fw-bold text-dark">6-Digit Verification Code</Form.Label>
                <Form.Control
                  type="text"
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="text-center fs-3 fw-bold letter-spacing-2"
                  style={{ letterSpacing: '6px' }}
                  required
                />
                <Form.Text className="text-muted small">
                  Check your inbox and spam folder for the email from Ministry of Tribal Affairs.
                </Form.Text>
              </Form.Group>

              <Button
                type="submit"
                variant="primary"
                className="w-100 fw-bold py-2.5 shadow-sm mb-3"
                disabled={loading || otp.length < 6}
                style={{ backgroundColor: '#0B2545', borderColor: '#0B2545' }}
              >
                {loading ? <Spinner size="sm" animation="border" /> : 'Verify & Continue →'}
              </Button>
            </Form>

            <div className="d-flex justify-content-between align-items-center border-top pt-3 mt-2">
              <span className="small text-muted">Didn't receive the email?</span>
              <Button
                variant="link"
                size="sm"
                className="text-decoration-none p-0 d-inline-flex align-items-center gap-1 fw-semibold"
                onClick={handleResendOtp}
                disabled={resending}
              >
                <RefreshCw size={13} className={resending ? 'spin' : ''} />
                <span>{resending ? 'Sending...' : 'Resend Code'}</span>
              </Button>
            </div>

            <div className="text-center mt-3">
              <Link to="/login" className="small text-muted text-decoration-none">
                ← Back to Login
              </Link>
            </div>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default VerifyOtp;
