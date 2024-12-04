import React, { useState, useEffect, useCallback } from 'react';
import { WorkOrderTable } from './WorkOrderTable';
import { WorkOrder } from '../types/WorkOrder';

export function WorkOrderPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);

  const fetchWorkOrders = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5069/api/workorders');
      if (!response.ok) throw new Error('Failed to fetch work orders');
      const data = await response.json();
      setWorkOrders(data);
    } catch (error) {
      console.error('Error fetching work orders:', error);
    }
  }, []);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  const handleDelete = useCallback(async (id: number) => {
    // TODO: Implement delete functionality
    console.log('Delete:', id);
  }, []);

  const handleUpdate = useCallback(async (workOrder: WorkOrder) => {
    // TODO: Implement update functionality
    console.log('Update:', workOrder);
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Work Orders</h1>
        <WorkOrderTable 
        workOrders={workOrders}
        onDelete={handleDelete}
        onUpdate={handleUpdate} 
      />
    </div>
  );
} 