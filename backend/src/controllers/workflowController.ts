import { Request, Response } from 'express';
import n8nService from '../services/n8nService';

// @desc    Get all workflows
// @route   GET /api/workflows
// @access  Private/Admin
export const getWorkflows = async (req: Request, res: Response) => {
  try {
    const workflows = await n8nService.getWorkflows();

    res.status(200).json({
      success: true,
      data: workflows,
    });
  } catch (error) {
    console.error('Get workflows error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Get a specific workflow
// @route   GET /api/workflows/:id
// @access  Private/Admin
export const getWorkflow = async (req: Request, res: Response) => {
  try {
    const workflow = await n8nService.getWorkflow(req.params.id);

    res.status(200).json({
      success: true,
      data: workflow,
    });
  } catch (error) {
    console.error(`Get workflow ${req.params.id} error:`, error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Execute a workflow
// @route   POST /api/workflows/:id/execute
// @access  Private/Admin
export const executeWorkflow = async (req: Request, res: Response) => {
  try {
    const result = await n8nService.executeWorkflow(req.params.id, req.body);

    res.status(200).json({
      success: true,
      data: {
        executionId: result.id,
        status: result.status,
      },
    });
  } catch (error) {
    console.error(`Execute workflow ${req.params.id} error:`, error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
}; 