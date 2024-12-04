import React, { useState } from 'react';
import { X } from 'lucide-react';
import { WorkOrder } from '../types/WorkOrder';

interface WorkOrderFormProps {
  onSubmit: (workOrder: WorkOrder) => void;
  onCancel: () => void;
}

export function WorkOrderForm({ onSubmit, onCancel }: WorkOrderFormProps) {
  const [formData, setFormData] = useState<WorkOrder>({
    workOrderNo: '',
    machineNo: '',
    operatorName: '',
    orderQty: 0,
    completedQty: 0
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.workOrderNo || !formData.machineNo || !formData.operatorName) {
      newErrors.required = 'Work Order No, Machine No, and Operator are required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
      setFormData({ 
        workOrderNo: '', 
        machineNo: '', 
        operatorName: '', 
        orderQty: 0,
        completedQty: 0 
      });
    }
  };

  const inputClasses = `
    w-full 
    bg-gray-800 
    border 
    border-gray-700 
    rounded-md 
    px-4 
    py-2 
    text-white 
    placeholder-gray-400
    focus:outline-none 
    focus:ring-2 
    focus:ring-blue-500 
    focus:border-transparent
    dark:bg-gray-900
    dark:text-white
    dark:placeholder-gray-500
  `;

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 p-6 rounded-lg shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-100">New Work Order</h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-200 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Work Order No.
          </label>
          <input
            type="text"
            required
            value={formData.workOrderNo}
            onChange={(e) => setFormData({ ...formData, workOrderNo: e.target.value })}
            className={inputClasses}
            placeholder="Enter work order number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Machine No.
          </label>
          <input
            type="text"
            required
            value={formData.machineNo}
            onChange={(e) => setFormData({ ...formData, machineNo: e.target.value })}
            className={inputClasses}
            placeholder="Enter machine number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Operator
          </label>
          <input
            type="text"
            required
            value={formData.operatorName}
            onChange={(e) => setFormData({ ...formData, operatorName: e.target.value })}
            className={inputClasses}
            placeholder="Enter operator name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Order Qty
          </label>
          <input
            type="number"
            required
            value={formData.orderQty}
            onChange={(e) => setFormData({ 
              ...formData, 
              orderQty: parseInt(e.target.value) || 0
            })}
            className={inputClasses}
            placeholder="Enter order quantity"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Completed Qty
          </label>
          <input
            type="number"
            required
            value={formData.completedQty}
            onChange={(e) => setFormData({ 
              ...formData, 
              completedQty: parseInt(e.target.value) || 0
            })}
            className={inputClasses}
            placeholder="Enter completed quantity"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-600 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Save Work Order
        </button>
      </div>
    </form>
  );
}