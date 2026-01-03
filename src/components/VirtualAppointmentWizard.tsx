import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, toZonedTime } from 'date-fns-tz';
import { supportService, VirtualAppointment } from '@/services/supportService';

type VirtualAppointmentWizardProps = {
  open: boolean;
  onClose: () => void;
};

const steps = [
  'Customer Details',
  'Phone Number',
  'Phone Verification',
  'Language',
  'Service',
  'Date & Time',
  'Confirmation',
];

const roles = [
  'Private Customer',
  'Contractor',
  'Architect',
  'Interior Designer',
  'Dealer/Importer',
  'Other',
];

const languages = ['English', 'עברית', 'Français', 'Русский'];

const services = [
  'Website Assistance',
  'Custom Product Planning',
  'Bank Transfer Payment',
  'Other',
];

const times = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
];

const countries = [
  { code: 'AZ', name: 'Azerbaijan', tz: 'Asia/Baku' },
  { code: 'IL', name: 'Israel', tz: 'Asia/Jerusalem' },
  { code: 'US', name: 'United States', tz: 'America/New_York' },
  { code: 'GB', name: 'United Kingdom', tz: 'Europe/London' },
  { code: 'FR', name: 'France', tz: 'Europe/Paris' },
  { code: 'DE', name: 'Germany', tz: 'Europe/Berlin' },
  { code: 'IT', name: 'Italy', tz: 'Europe/Rome' },
  { code: 'CA', name: 'Canada', tz: 'America/Toronto' },
  { code: 'AU', name: 'Australia', tz: 'Australia/Sydney' },
  { code: 'CH', name: 'Switzerland', tz: 'Europe/Zurich' },
  { code: 'NL', name: 'Netherlands', tz: 'Europe/Amsterdam' },
  { code: 'GR', name: 'Greece', tz: 'Europe/Athens' },
  { code: 'TR', name: 'Turkey', tz: 'Europe/Istanbul' },
  { code: 'AE', name: 'UAE', tz: 'Asia/Dubai' },
];

function VirtualAppointmentWizard({
  open,
  onClose,
}: VirtualAppointmentWizardProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    phoneCode: '',
    phoneVerified: false,
    country: '',
    language: '',
    service: '',
    date: '',
    time: '',
  });
  const [codeSent, setCodeSent] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const handleConfirmAppointment = async () => {
    try {
      setIsSubmitting(true);

      // יצירת טיקט בדשבורד התמיכה
      const appointmentData: VirtualAppointment = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        country: form.country,
        language: form.language,
        service: form.service,
        date: form.date,
        time: form.time,
      };

      // נסה ליצור טיקט (אם יש token)
      try {
        const adminToken = localStorage.getItem('adminToken');
        if (adminToken) {
          await supportService.createVirtualAppointment(appointmentData);
          console.log('✅ Virtual appointment ticket created successfully');
        }
      } catch (error) {
        console.log('⚠️ Could not create support ticket (no admin token)');
      }

      // המשך לשלב הבא
      setStep(step + 1);
    } catch (error) {
      console.error('Error creating appointment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleNext = () => setStep(s => Math.min(s + 1, steps.length - 1));
  const handleBack = () => setStep(s => Math.max(s - 1, 0));

  // Phone verification demo logic
  const sendCode = () => {
    setCodeSent(true);
    setCodeError('');
  };
  const verifyCode = () => {
    if (form.phoneCode === '1234') {
      setForm({ ...form, phoneVerified: true });
      setTimeout(() => setStep(s => s + 1), 300);
      setCodeError('');
    } else {
      setCodeError('Invalid code. Try 1234.');
    }
  };

  // Date/time selection demo
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  function getCountryPrefix(code: string): string {
    switch (code) {
      case 'IL':
        return '972';
      case 'US':
        return '1';
      case 'GB':
        return '44';
      case 'FR':
        return '33';
      case 'DE':
        return '49';
      case 'IT':
        return '39';
      case 'CA':
        return '1';
      case 'AU':
        return '61';
      case 'CH':
        return '41';
      case 'NL':
        return '31';
      case 'GR':
        return '30';
      case 'TR':
        return '90';
      case 'AE':
        return '971';
      case 'AZ':
        return '994';
      default:
        return '';
    }
  }

  // פונקציה שמחזירה מערך של חצאי שעות בין 09:00 ל-17:00 לפי timezone
  function getAvailableTimes(tz: string, date: Date) {
    // טווח השעות לפי Asia/Baku
    const bakuTz = 'Asia/Baku';
    const times = [];
    for (let h = 9; h <= 17; h++) {
      for (let m = 0; m < 60; m += 30) {
        if (h === 17 && m > 0) continue;
        // יוצרים תאריך ב-Baku
        const bakuDate = new Date(date);
        bakuDate.setHours(h, m, 0, 0);
        // ממירים לזמן היעד
        const localDate = toZonedTime(bakuDate, tz);
        // מציגים בפורמט HH:mm
        const localHour = localDate.getHours().toString().padStart(2, '0');
        const localMin = localDate.getMinutes().toString().padStart(2, '0');
        times.push(`${localHour}:${localMin}`);
      }
    }
    // מסירים כפילויות (למקרה של קפיצות שעון קיץ)
    return Array.from(new Set(times));
  }

  return (
    open && (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
        onClick={onClose}
      >
        <div
          className="bg-white shadow-2xl p-8 w-full max-w-md relative mx-4"
          onClick={e => e.stopPropagation()}
        >
          <button
            className="absolute left-1/2 -translate-x-1/2 top-2 text-2xl cursor-pointer"
            onClick={onClose}
          >
            ×
          </button>
          <div className="p-8">
            {/* Title */}
            <h1 className="text-3xl font-serif font-semibold text-[#1a1a2e] mb-6 tracking-wide text-center">
              Virtual Appointment
            </h1>

            {/* Progress Bar */}
            {step < steps.length - 1 && (
              <div className="mb-8">
                <div className="w-full h-0.5 bg-gray-200 rounded">
                  <div
                    className="h-full bg-[#1a1a2e] transition-all duration-500 rounded"
                    style={{
                      width: `${((step + 1) / steps.length) * 100}%`,
                      height: 3,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Step Content */}
            <div className="min-h-[320px]">
              {step === 0 && (
                <form
                  className="space-y-6"
                  onSubmit={e => {
                    e.preventDefault();
                    handleNext();
                  }}
                >
                  <h2 className="text-2xl font-serif font-semibold text-[#1a1a2e] mb-6 tracking-wide text-center">
                    Customer Details
                  </h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block mb-3 font-semibold text-gray-800 text-lg">
                        Full Name
                      </label>
                      <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        className="w-full border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] transition-all"
                        style={{ borderRadius: 0 }}
                      />
                    </div>
                    <div>
                      <label className="block mb-3 font-semibold text-gray-800 text-lg">
                        Email
                      </label>
                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                        className="w-full border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] transition-all"
                        style={{ borderRadius: 0 }}
                      />
                    </div>
                    <div>
                      <label className="block mb-3 font-semibold text-gray-800 text-lg">
                        Role
                      </label>
                      <select
                        name="role"
                        value={form.role}
                        onChange={handleChange}
                        required
                        className="w-full border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] transition-all"
                        style={{ borderRadius: 0, cursor: 'pointer' }}
                      >
                        <option value="" style={{ cursor: 'pointer' }}>
                          Select your role...
                        </option>
                        {roles.map(r => (
                          <option key={r} style={{ cursor: 'pointer' }}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end pt-8">
                    <button
                      type="submit"
                      className="bg-[#1a1a2e] text-white px-6 py-3 text-base font-semibold hover:bg-[#23243a] transition-colors"
                      style={{ borderRadius: 0, cursor: 'pointer' }}
                    >
                      Next
                    </button>
                  </div>
                </form>
              )}

              {/* Phone Number Step */}
              {step === 1 && (
                <form
                  className="space-y-6"
                  onSubmit={e => {
                    e.preventDefault();
                    if (!form.phone) return;
                    sendCode();
                    handleNext();
                  }}
                >
                  <h2 className="text-2xl font-serif font-semibold text-[#1a1a2e] mb-6 tracking-wide text-center">
                    Phone Number
                  </h2>
                  <div className="flex items-center mb-2">
                    <span
                      className="px-3 py-2 bg-gray-100 border border-gray-300 text-base select-none"
                      style={{ borderRadius: 0 }}
                    >
                      +{getCountryPrefix(form.country)}
                    </span>
                    <input
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                      required
                      placeholder="Phone number"
                      className="w-full border border-gray-300 px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] transition-all"
                      style={{ borderRadius: 0 }}
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block mb-2 font-semibold text-gray-800 text-lg">
                      Country
                    </label>
                    <select
                      name="country"
                      value={form.country}
                      onChange={e =>
                        setForm({ ...form, country: e.target.value })
                      }
                      className="w-full border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] transition-all cursor-pointer"
                      style={{ borderRadius: 0 }}
                    >
                      <option value="" disabled>
                        Select country
                      </option>
                      {countries.map(c => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-between pt-8">
                    <button
                      type="button"
                      className="bg-[#1a1a2e] text-white px-6 py-3 text-base font-semibold hover:bg-[#23243a] transition-colors"
                      onClick={handleBack}
                      style={{ borderRadius: 0, cursor: 'pointer' }}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="bg-[#1a1a2e] text-white px-6 py-3 text-base font-semibold hover:bg-[#23243a] transition-colors"
                      style={{ borderRadius: 0, cursor: 'pointer' }}
                    >
                      Next
                    </button>
                  </div>
                </form>
              )}

              {/* Phone Verification Step */}
              {step === 2 && (
                <form
                  className="space-y-6"
                  onSubmit={e => {
                    e.preventDefault();
                    verifyCode();
                  }}
                >
                  <h2 className="text-2xl font-serif font-semibold text-[#1a1a2e] mb-6 tracking-wide text-center">
                    Phone Verification
                  </h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block mb-3 font-semibold text-gray-800 text-lg">
                        Verification Code
                      </label>
                      <input
                        name="phoneCode"
                        value={form.phoneCode}
                        onChange={handleChange}
                        className="w-full border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] transition-all"
                        style={{ borderRadius: 0 }}
                      />
                    </div>
                    {codeError && (
                      <div className="text-red-600 text-base font-semibold">
                        {codeError}
                      </div>
                    )}
                    {form.phoneVerified && (
                      <div className="text-green-700 font-bold text-lg text-center py-4">
                        ✓ Phone verified successfully!
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between pt-8">
                    <button
                      type="button"
                      className="bg-[#1a1a2e] text-white px-6 py-3 text-base font-semibold hover:bg-[#23243a] transition-colors"
                      onClick={handleBack}
                      style={{ borderRadius: 0, cursor: 'pointer' }}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="bg-[#1a1a2e] text-white px-6 py-3 text-base font-semibold hover:bg-[#23243a] transition-colors"
                      style={{ borderRadius: 0, cursor: 'pointer' }}
                    >
                      Next
                    </button>
                  </div>
                </form>
              )}

              {step === 3 && (
                <form
                  className="space-y-6"
                  onSubmit={e => {
                    e.preventDefault();
                    handleNext();
                  }}
                >
                  <h2 className="text-2xl font-serif font-semibold text-[#1a1a2e] mb-6 tracking-wide text-center">
                    Language
                  </h2>
                  <div>
                    <label className="block mb-3 font-semibold text-gray-800 text-lg">
                      Preferred Language
                    </label>
                    <select
                      name="language"
                      value={form.language}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] transition-all cursor-pointer"
                      style={{ borderRadius: 0 }}
                    >
                      <option value="" disabled>
                        Select language
                      </option>
                      {languages.map(lang => (
                        <option key={lang} value={lang}>
                          {lang}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-between pt-8">
                    <button
                      type="button"
                      className="bg-[#1a1a2e] text-white px-6 py-3 text-base font-semibold hover:bg-[#23243a] transition-colors"
                      onClick={handleBack}
                      style={{ borderRadius: 0, cursor: 'pointer' }}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="bg-[#1a1a2e] text-white px-6 py-3 text-base font-semibold hover:bg-[#23243a] transition-colors"
                      style={{ borderRadius: 0, cursor: 'pointer' }}
                    >
                      Next
                    </button>
                  </div>
                </form>
              )}

              {step === 4 && (
                <form
                  className="space-y-6"
                  onSubmit={e => {
                    e.preventDefault();
                    handleNext();
                  }}
                >
                  <h2 className="text-2xl font-serif font-semibold text-[#1a1a2e] mb-6 tracking-wide text-center">
                    Service
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block mb-3 font-semibold text-gray-800 text-lg">
                        Service Type
                      </label>
                      <select
                        name="service"
                        value={form.service}
                        onChange={handleChange}
                        required
                        className="w-full border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] transition-all"
                        style={{ borderRadius: 0, cursor: 'pointer' }}
                      >
                        <option value="" style={{ cursor: 'pointer' }}>
                          Select a service...
                        </option>
                        {services.map(s => (
                          <option key={s} style={{ cursor: 'pointer' }}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-between pt-8">
                    <button
                      type="button"
                      className="bg-[#1a1a2e] text-white px-6 py-3 text-base font-semibold hover:bg-[#23243a] transition-colors"
                      onClick={handleBack}
                      style={{ borderRadius: 0, cursor: 'pointer' }}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="bg-[#1a1a2e] text-white px-6 py-3 text-base font-semibold hover:bg-[#23243a] transition-colors"
                      style={{ borderRadius: 0, cursor: 'pointer' }}
                    >
                      Next
                    </button>
                  </div>
                </form>
              )}

              {step === 5 && (
                <form
                  className="space-y-6"
                  onSubmit={e => {
                    e.preventDefault();
                    handleNext();
                  }}
                >
                  <h2 className="text-2xl font-serif font-semibold text-[#1a1a2e] mb-6 tracking-wide text-center">
                    Date & Time
                  </h2>
                  <div className="mb-6">
                    <label className="block mb-3 font-semibold text-gray-800 text-lg">
                      Select Date
                    </label>
                    <DatePicker
                      selected={form.date ? new Date(form.date) : null}
                      onChange={(date: Date | null) =>
                        setForm({ ...form, date: date?.toISOString() || '' })
                      }
                      minDate={new Date()}
                      className="w-full border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] transition-all"
                      dateFormat="yyyy-MM-dd"
                      placeholderText="Select date"
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block mb-3 font-semibold text-gray-800 text-lg">
                      Select Time
                    </label>
                    <select
                      name="time"
                      value={form.time}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] transition-all cursor-pointer"
                      style={{ borderRadius: 0 }}
                    >
                      <option value="" disabled>
                        Select time
                      </option>
                      {(() => {
                        const countryObj = countries.find(
                          c => c.code === form.country
                        );
                        if (!countryObj) return null;
                        return getAvailableTimes(
                          countryObj.tz,
                          form.date ? new Date(form.date) : new Date()
                        ).map(t => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ));
                      })()}
                    </select>
                    {/* הצגת timezone ודגל */}
                    <div className="text-center text-gray-500 text-sm mt-2">
                      {(() => {
                        const countryObj = countries.find(
                          c => c.code === form.country
                        );
                        if (!countryObj) return null;
                        return `All times are in ${countryObj.tz} time`;
                      })()}
                    </div>
                  </div>
                  <div className="flex justify-between pt-8">
                    <button
                      type="button"
                      className="bg-[#1a1a2e] text-white px-6 py-3 text-base font-semibold hover:bg-[#23243a] transition-colors"
                      onClick={handleBack}
                      style={{ borderRadius: 0, cursor: 'pointer' }}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="bg-[#1a1a2e] text-white px-6 py-3 text-base font-semibold hover:bg-[#23243a] transition-colors"
                      style={{ borderRadius: 0, cursor: 'pointer' }}
                    >
                      Next
                    </button>
                  </div>
                </form>
              )}

              {step === 6 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-serif font-semibold text-[#1a1a2e] mb-6 tracking-wide text-center">
                    Review & Confirm
                  </h2>
                  <div className="bg-gray-50 p-6 border border-gray-200 space-y-3">
                    <div className="text-lg">
                      <span className="font-bold text-[#1a1a2e]">Name:</span>{' '}
                      {form.name}
                    </div>
                    <div className="text-lg">
                      <span className="font-bold text-[#1a1a2e]">Email:</span>{' '}
                      {form.email}
                    </div>
                    <div className="text-lg">
                      <span className="font-bold text-[#1a1a2e]">Phone:</span>{' '}
                      {form.phone}
                    </div>
                    <div className="text-lg">
                      <span className="font-bold text-[#1a1a2e]">Role:</span>{' '}
                      {form.role}
                    </div>
                    <div className="text-lg">
                      <span className="font-bold text-[#1a1a2e]">
                        Language:
                      </span>{' '}
                      {form.language}
                    </div>
                    <div className="text-lg">
                      <span className="font-bold text-[#1a1a2e]">Service:</span>{' '}
                      {form.service}
                    </div>
                    <div className="text-lg">
                      <span className="font-bold text-[#1a1a2e]">Date:</span>{' '}
                      {form.date
                        ? new Date(form.date).toLocaleDateString()
                        : ''}
                    </div>
                    <div className="text-lg">
                      <span className="font-bold text-[#1a1a2e]">Time:</span>{' '}
                      {form.time}
                    </div>
                  </div>
                  <div className="flex justify-between pt-8">
                    <button
                      type="button"
                      className="bg-[#1a1a2e] text-white px-6 py-3 text-base font-semibold hover:bg-[#23243a] transition-colors"
                      onClick={handleBack}
                      style={{ borderRadius: 0, cursor: 'pointer' }}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="bg-[#1a1a2e] text-white px-6 py-3 text-base font-semibold hover:bg-[#23243a] transition-colors disabled:opacity-50"
                      onClick={handleConfirmAppointment}
                      disabled={isSubmitting}
                      style={{ borderRadius: 0, cursor: 'pointer' }}
                    >
                      {isSubmitting ? 'Creating...' : 'Confirm'}
                    </button>
                  </div>
                </div>
              )}

              {step === 7 && (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="flex justify-center mb-6">
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 48 48"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect
                        x="6"
                        y="10"
                        width="36"
                        height="32"
                        rx="4"
                        fill="#fff"
                        stroke="#1a1a2e"
                        strokeWidth="2"
                      />
                      <rect x="6" y="10" width="36" height="8" fill="#1a1a2e" />
                      <rect
                        x="14"
                        y="4"
                        width="4"
                        height="8"
                        rx="2"
                        fill="#1a1a2e"
                      />
                      <rect
                        x="30"
                        y="4"
                        width="4"
                        height="8"
                        rx="2"
                        fill="#1a1a2e"
                      />
                      <path
                        d="M18 30L23 35L32 24"
                        stroke="#22c55e"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="text-2xl font-semibold mb-3 text-[#1a1a2e]">
                    Thank you!
                  </div>
                  <div className="text-base text-gray-600 mb-8 text-center">
                    Your virtual appointment has been scheduled successfully.
                    <br />
                    We will contact you shortly to confirm the details.
                  </div>
                  <button
                    className="bg-[#1a1a2e] text-white px-6 py-3 text-base font-semibold hover:bg-[#23243a] transition-colors"
                    onClick={onClose}
                    style={{ borderRadius: 0, cursor: 'pointer' }}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  );
}
export default VirtualAppointmentWizard;
