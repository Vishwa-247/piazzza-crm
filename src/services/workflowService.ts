
import { Lead } from './dataService';
import { toast } from '@/hooks/use-toast';

export interface WorkflowAction {
  id: string;
  type: 'send_email' | 'update_status' | 'create_task';
  label: string;
  config?: any;
}

export interface WorkflowExecution {
  id: string;
  leadId: string;
  actions: WorkflowAction[];
  status: 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  results: string[];
}

class WorkflowService {
  private executions: WorkflowExecution[] = [];

  // Execute workflow for a specific lead
  async executeWorkflowForLead(leadId: string, actions: WorkflowAction[]): Promise<WorkflowExecution> {
    const execution: WorkflowExecution = {
      id: `exec_${Date.now()}`,
      leadId,
      actions,
      status: 'running',
      startTime: new Date(),
      results: []
    };

    this.executions.push(execution);

    console.log(`🚀 Starting workflow execution for lead ${leadId}`);
    
    try {
      // Get lead data
      const leadData = this.getLeadById(leadId);
      if (!leadData) {
        throw new Error(`Lead ${leadId} not found`);
      }

      console.log(`👤 Processing workflow for: ${leadData.name} (${leadData.email})`);

      // Execute each action in sequence
      for (const action of actions) {
        await this.executeAction(action, leadData, execution);
      }

      execution.status = 'completed';
      execution.endTime = new Date();
      
      console.log(`✅ Workflow completed for ${leadData.name}`);
      
      toast({
        title: "Workflow Executed Successfully",
        description: `Completed ${actions.length} actions for ${leadData.name}`,
      });

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.results.push(`❌ Error: ${error}`);
      
      console.error(`❌ Workflow failed:`, error);
      
      toast({
        title: "Workflow Failed",
        description: `Error executing workflow: ${error}`,
        variant: "destructive",
      });
    }

    return execution;
  }

  // Execute individual action
  private async executeAction(action: WorkflowAction, lead: Lead, execution: WorkflowExecution): Promise<void> {
    console.log(`🔄 Executing action: ${action.label}`);
    
    switch (action.type) {
      case 'send_email':
        await this.sendEmail(lead, execution);
        break;
      
      case 'update_status':
        await this.updateLeadStatus(lead, execution);
        break;
      
      case 'create_task':
        await this.createTask(lead, execution);
        break;
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  // Send email action
  private async sendEmail(lead: Lead, execution: WorkflowExecution): Promise<void> {
    const subject = `Welcome to Our CRM - ${lead.name}`;
    const body = `Hi ${lead.name},\n\nThank you for your interest! We'll be in touch soon.\n\nBest regards,\nSales Team`;
    
    // Create mailto link (opens user's email client)
    const mailtoLink = `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Simulate email being "sent" by opening user's email client
    window.open(mailtoLink, '_blank');
    
    const result = `📧 Email prepared for ${lead.name} (${lead.email})`;
    execution.results.push(result);
    console.log(result);
    
    // Add small delay to simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Update lead status action
  private async updateLeadStatus(lead: Lead, execution: WorkflowExecution): Promise<void> {
    // Import dynamically to avoid circular dependency
    const { updateLead } = await import('./dataService');
    
    const newStatus = 'contacted';
    updateLead(lead.id, { status: newStatus });
    
    const result = `🔄 Updated ${lead.name}'s status to: ${newStatus}`;
    execution.results.push(result);
    console.log(result);
    
    // Trigger UI update event
    window.dispatchEvent(new CustomEvent('leadUpdated', { 
      detail: { leadId: lead.id, updates: { status: newStatus } }
    }));
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Create task action
  private async createTask(lead: Lead, execution: WorkflowExecution): Promise<void> {
    const task = `Follow up with ${lead.name} - ${new Date().toLocaleDateString()}`;
    
    const result = `📋 Created task: ${task}`;
    execution.results.push(result);
    console.log(result);
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Get lead by ID
  private getLeadById(leadId: string): Lead | null {
    const { loadData } = require('./dataService');
    const data = loadData();
    return data.leads.find((lead: Lead) => lead.id === leadId) || null;
  }

  // Auto-trigger workflow when new lead is created
  async autoTriggerWorkflow(leadId: string): Promise<void> {
    const savedWorkflow = this.getSavedWorkflow();
    if (savedWorkflow && savedWorkflow.nodes.length > 1) {
      console.log(`🤖 Auto-triggering workflow for new lead: ${leadId}`);
      
      // Extract actions from saved workflow
      const actions = this.extractActionsFromWorkflow(savedWorkflow);
      
      if (actions.length > 0) {
        await this.executeWorkflowForLead(leadId, actions);
      }
    }
  }

  // Extract actions from saved workflow
  private extractActionsFromWorkflow(workflow: any): WorkflowAction[] {
    const actions: WorkflowAction[] = [];
    
    // Find action nodes (exclude trigger nodes)
    const actionNodes = workflow.nodes.filter((node: any) => 
      node.id !== '1' && node.data.label !== 'Lead Created'
    );
    
    actionNodes.forEach((node: any) => {
      if (node.data.label.includes('Send Email')) {
        actions.push({
          id: node.id,
          type: 'send_email',
          label: 'Send Welcome Email'
        });
      } else if (node.data.label.includes('Update Status')) {
        actions.push({
          id: node.id,
          type: 'update_status',
          label: 'Update Lead Status'
        });
      } else if (node.data.label.includes('Create Task')) {
        actions.push({
          id: node.id,
          type: 'create_task',
          label: 'Create Follow-up Task'
        });
      }
    });
    
    return actions;
  }

  // Get saved workflow from localStorage
  private getSavedWorkflow(): any {
    try {
      const saved = localStorage.getItem('crm-workflow');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  // Get execution history
  getExecutionHistory(): WorkflowExecution[] {
    return [...this.executions].reverse();
  }

  // Execute current workflow manually
  async executeCurrentWorkflow(): Promise<void> {
    const savedWorkflow = this.getSavedWorkflow();
    if (!savedWorkflow) {
      toast({
        title: "No Workflow Found",
        description: "Please create and save a workflow first",
        variant: "destructive",
      });
      return;
    }

    // Get the most recent lead to demonstrate with
    const { loadData } = await import('./dataService');
    const data = loadData();
    
    if (data.leads.length === 0) {
      toast({
        title: "No Leads Found",
        description: "Please create a lead first to test the workflow",
        variant: "destructive",
      });
      return;
    }

    const latestLead = data.leads[0];
    const actions = this.extractActionsFromWorkflow(savedWorkflow);
    
    if (actions.length === 0) {
      toast({
        title: "No Actions Found",
        description: "Please add actions to your workflow",
        variant: "destructive",
      });
      return;
    }

    await this.executeWorkflowForLead(latestLead.id, actions);
  }
}

export const workflowService = new WorkflowService();
