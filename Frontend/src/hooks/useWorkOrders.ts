import { useState, useEffect } from 'react';
import { WorkOrder, ApiResponse } from '../types/WorkOrder';
import { API_URL } from '../config';

export function useWorkOrders() {
  const [state, setState] = useState<ApiResponse<WorkOrder[]>>({
    data: [],
    error: null,
    loading: true
  });

  const fetchWorkOrders = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch(`${API_URL}/workorders`);
      
      if (!response.ok) {
        let errorMessage = 'Failed to fetch work orders';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.title || errorMessage;
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      // Validate the response data
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format');
      }
      
      setState({ 
        data, 
        loading: false, 
        error: null 
      });
    } catch (error) {
      console.error('Error fetching work orders:', error);
      setState({ 
        data: [], 
        loading: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    }
  };

  const createWorkOrder = async (workOrder: WorkOrder) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch(`${API_URL}/workorders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workOrderNo: workOrder.workOrderNo,
          machineNo: workOrder.machineNo,
          operatorName: workOrder.operatorName,
          orderQty: workOrder.orderQty,
          completedQty: workOrder.completedQty
        })
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to create work order';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.error || errorMessage;
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        throw new Error(errorMessage);
      }
      
      await fetchWorkOrders();
      return true;
    } catch (error) {
      console.error('Error creating work order:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to create work order'
      }));
      return false;
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  return { ...state, createWorkOrder, refetch: fetchWorkOrders };
}