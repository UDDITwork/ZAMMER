import React from 'react';
import { useParams } from 'react-router-dom';

const EditProduct = () => {
  const { id } = useParams();
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Edit Product</h1>
      <p className="text-gray-600">Product ID: {id}</p>
      <p className="text-gray-500">This page is under construction.</p>
    </div>
  );
};

export default EditProduct; 