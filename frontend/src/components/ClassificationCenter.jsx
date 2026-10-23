import React from "react";
import BarangayClassifier from "./BarangayClassifier";

/**
 * ClassificationCenter
 * Dedicated specifically for District V Barangay Socio-Economic Income Classification.
 */
export default function ClassificationCenter() {
  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <BarangayClassifier />
    </div>
  );
}
