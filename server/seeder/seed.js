import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Form from '../models/Form.js';
import Workflow from '../models/Workflow.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data (optional - comment out if you want to keep existing data)
    await User.deleteMany({});
    await Form.deleteMany({});
    await Workflow.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'admin123', // Will be hashed automatically
      role: 'admin',
      permissions: [
        'create_forms',
        'edit_forms',
        'delete_forms',
        'view_submissions',
        'manage_users',
        'manage_workflows'
      ],
      organization: 'default',
      isActive: true
    });
    console.log('Admin user created:', adminUser.email);

    // Create manager user
    const managerUser = await User.create({
      name: 'Manager User',
      email: 'manager@example.com',
      password: 'manager123',
      role: 'manager',
      permissions: ['create_forms', 'edit_forms', 'view_submissions'],
      organization: 'default',
      isActive: true
    });
    console.log('Manager user created:', managerUser.email);

    // Create regular user
    const regularUser = await User.create({
      name: 'John Doe',
      email: 'user@example.com',
      password: 'user123',
      role: 'user',
      permissions: [],
      organization: 'default',
      isActive: true
    });
    console.log('Regular user created:', regularUser.email);

    // Create sample workflow
    const approvalWorkflow = await Workflow.create({
      name: 'Standard Approval Workflow',
      description: 'A standard three-stage approval workflow',
      stages: [
        {
          id: 'draft',
          name: 'Draft',
          description: 'Initial draft stage',
          allowedRoles: ['user', 'manager', 'admin'],
          allowedUsers: [],
          actions: [
            {
              id: 'submit',
              name: 'Submit for Review',
              nextStage: 'review',
              requireComment: false
            }
          ],
          order: 0
        },
        {
          id: 'review',
          name: 'Under Review',
          description: 'Manager review stage',
          allowedRoles: ['manager', 'admin'],
          allowedUsers: [],
          actions: [
            {
              id: 'approve',
              name: 'Approve',
              nextStage: 'approved',
              requireComment: false
            },
            {
              id: 'reject',
              name: 'Reject',
              nextStage: 'rejected',
              requireComment: true
            },
            {
              id: 'return',
              name: 'Return to Draft',
              nextStage: 'draft',
              requireComment: true
            }
          ],
          order: 1
        },
        {
          id: 'approved',
          name: 'Approved',
          description: 'Final approval stage',
          allowedRoles: ['admin'],
          allowedUsers: [],
          actions: [],
          order: 2
        },
        {
          id: 'rejected',
          name: 'Rejected',
          description: 'Rejected stage',
          allowedRoles: ['admin'],
          allowedUsers: [],
          actions: [
            {
              id: 'reopen',
              name: 'Reopen',
              nextStage: 'draft',
              requireComment: true
            }
          ],
          order: 3
        }
      ],
      initialStage: 'draft',
      finalStages: ['approved', 'rejected'],
      organization: 'default',
      createdBy: adminUser._id,
      isActive: true,
      version: 1
    });
    console.log('Workflow created:', approvalWorkflow.name);

    // Create sample forms
    const contactForm = await Form.create({
      title: 'Contact Form',
      description: 'A simple contact form for customer inquiries',
      fields: [
        {
          id: 'field_name',
          type: 'text',
          label: 'Full Name',
          placeholder: 'Enter your full name',
          required: true,
          order: 0
        },
        {
          id: 'field_email',
          type: 'email',
          label: 'Email Address',
          placeholder: 'your.email@example.com',
          required: true,
          order: 1
        },
        {
          id: 'field_phone',
          type: 'text',
          label: 'Phone Number',
          placeholder: '+1 (555) 123-4567',
          required: false,
          order: 2
        },
        {
          id: 'field_subject',
          type: 'select',
          label: 'Subject',
          placeholder: 'Select a subject',
          required: true,
          options: ['General Inquiry', 'Support Request', 'Sales Question', 'Feedback'],
          order: 3
        },
        {
          id: 'field_message',
          type: 'textarea',
          label: 'Message',
          placeholder: 'Type your message here...',
          required: true,
          helpText: 'Please provide as much detail as possible',
          order: 4
        }
      ],
      settings: {
        allowMultipleSubmissions: true,
        requireLogin: false,
        showProgress: false,
        confirmationMessage: 'Thank you for contacting us! We will get back to you soon.'
      },
      styling: {
        theme: 'default',
        primaryColor: '#3B82F6',
        backgroundColor: '#FFFFFF'
      },
      workflow: approvalWorkflow._id,
      assignedUsers: [managerUser._id],
      assignedRoles: ['user', 'manager'],
      organization: 'default',
      createdBy: adminUser._id,
      isActive: true,
      version: 1,
      tags: ['contact', 'customer', 'inquiry']
    });
    console.log('Contact form created:', contactForm.title);

    const employeeSurvey = await Form.create({
      title: 'Employee Satisfaction Survey',
      description: 'Annual employee satisfaction and feedback survey',
      fields: [
        {
          id: 'field_employee_id',
          type: 'text',
          label: 'Employee ID',
          placeholder: 'Enter your employee ID',
          required: true,
          order: 0
        },
        {
          id: 'field_department',
          type: 'select',
          label: 'Department',
          required: true,
          options: ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations'],
          order: 1
        },
        {
          id: 'field_satisfaction',
          type: 'radio',
          label: 'Overall Job Satisfaction',
          required: true,
          options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'],
          order: 2
        },
        {
          id: 'field_recommendation',
          type: 'radio',
          label: 'Would you recommend this company to a friend?',
          required: true,
          options: ['Definitely Yes', 'Probably Yes', 'Not Sure', 'Probably No', 'Definitely No'],
          order: 3
        },
        {
          id: 'field_improvements',
          type: 'checkbox',
          label: 'Areas for Improvement (select all that apply)',
          required: false,
          options: [
            'Work-Life Balance',
            'Compensation',
            'Career Development',
            'Management',
            'Company Culture',
            'Benefits',
            'Communication'
          ],
          order: 4
        },
        {
          id: 'field_comments',
          type: 'textarea',
          label: 'Additional Comments',
          placeholder: 'Share your thoughts and suggestions...',
          required: false,
          helpText: 'Your feedback is valuable to us',
          order: 5
        }
      ],
      settings: {
        allowMultipleSubmissions: false,
        requireLogin: true,
        showProgress: true,
        confirmationMessage: 'Thank you for your feedback! Your responses will help us improve.'
      },
      styling: {
        theme: 'modern',
        primaryColor: '#10B981',
        backgroundColor: '#F3F4F6'
      },
      workflow: approvalWorkflow._id,
      assignedUsers: [],
      assignedRoles: ['user', 'manager', 'admin'],
      organization: 'default',
      createdBy: adminUser._id,
      isActive: true,
      version: 1,
      tags: ['survey', 'employee', 'feedback', 'hr']
    });
    console.log('Employee survey created:', employeeSurvey.title);

    const leaveRequest = await Form.create({
      title: 'Leave Request Form',
      description: 'Submit requests for time off',
      fields: [
        {
          id: 'field_leave_type',
          type: 'select',
          label: 'Type of Leave',
          required: true,
          options: ['Vacation', 'Sick Leave', 'Personal Leave', 'Maternity/Paternity', 'Other'],
          order: 0
        },
        {
          id: 'field_start_date',
          type: 'date',
          label: 'Start Date',
          required: true,
          order: 1
        },
        {
          id: 'field_end_date',
          type: 'date',
          label: 'End Date',
          required: true,
          order: 2
        },
        {
          id: 'field_reason',
          type: 'textarea',
          label: 'Reason for Leave',
          placeholder: 'Please explain the reason for your leave request',
          required: true,
          order: 3
        },
        {
          id: 'field_contact',
          type: 'text',
          label: 'Emergency Contact',
          placeholder: 'Phone number where you can be reached',
          required: true,
          order: 4
        }
      ],
      settings: {
        allowMultipleSubmissions: true,
        requireLogin: true,
        showProgress: false,
        confirmationMessage: 'Your leave request has been submitted for approval.'
      },
      styling: {
        theme: 'default',
        primaryColor: '#8B5CF6',
        backgroundColor: '#FFFFFF'
      },
      workflow: approvalWorkflow._id,
      assignedUsers: [],
      assignedRoles: ['user', 'manager', 'admin'],
      organization: 'default',
      createdBy: adminUser._id,
      isActive: true,
      version: 1,
      tags: ['hr', 'leave', 'request']
    });
    console.log('Leave request form created:', leaveRequest.title);

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📝 Login Credentials:');
    console.log('------------------------');
    console.log('Admin User:');
    console.log('  Email: admin@example.com');
    console.log('  Password: admin123');
    console.log('\nManager User:');
    console.log('  Email: manager@example.com');
    console.log('  Password: manager123');
    console.log('\nRegular User:');
    console.log('  Email: user@example.com');
    console.log('  Password: user123');
    console.log('------------------------\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seeder
seedDatabase();