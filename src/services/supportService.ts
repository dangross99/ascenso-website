export interface VirtualAppointment {
  name: string;
  email: string;
  phone: string;
  role: string;
  country: string;
  language: string;
  service: string;
  date: string;
  time: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category:
    | 'technical'
    | 'billing'
    | 'product'
    | 'general'
    | 'virtual_appointment';
  assignedTo?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

class SupportService {
  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const url = `${baseUrl}/api${endpoint}`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async createVirtualAppointment(
    appointment: VirtualAppointment
  ): Promise<Ticket> {
    const ticketData = {
      subject: `פגישה וירטואלית - ${appointment.name}`,
      description: `
        **פגישה וירטואלית חדשה**
        
        **פרטי לקוח:**
        - שם: ${appointment.name}
        - אימייל: ${appointment.email}
        - טלפון: ${appointment.phone}
        - תפקיד: ${appointment.role}
        - מדינה: ${appointment.country}
        - שפה: ${appointment.language}
        
        **פרטי הפגישה:**
        - שירות: ${appointment.service}
        - תאריך: ${appointment.date}
        - שעה: ${appointment.time}
        
        **סטטוס:** ממתין לאישור
        **עדיפות:** גבוהה
      `,
      status: 'open' as const,
      priority: 'high' as const,
      category: 'virtual_appointment' as const,
      customer: {
        name: appointment.name,
        email: appointment.email,
      },
    };

    const response = await this.makeRequest('/support/tickets', {
      method: 'POST',
      body: JSON.stringify(ticketData),
    });

    return response.data;
  }

  async sendVerificationCode(
    phone: string,
    countryCode: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.makeRequest('/auth/send-verification', {
        method: 'POST',
        body: JSON.stringify({ phone, countryCode }),
      });
      return { success: true, message: 'קוד אימות נשלח בהצלחה' };
    } catch (error) {
      return { success: false, message: 'שגיאה בשליחת קוד אימות' };
    }
  }

  async verifyCode(
    phone: string,
    code: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.makeRequest('/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
      });
      return { success: true, message: 'קוד אימות תקין' };
    } catch (error) {
      return { success: false, message: 'קוד אימות שגוי' };
    }
  }
}

export const supportService = new SupportService();
