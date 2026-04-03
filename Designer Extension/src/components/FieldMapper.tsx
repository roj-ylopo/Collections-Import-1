import React from "react";
import { FieldMapping, CollectionField } from "../types/index";

interface FieldMapperProps {
  sourceFields: string[];
  targetFields: CollectionField[];
  mappings: FieldMapping[];
  onChange: (mappings: FieldMapping[]) => void;
}

const FieldMapper: React.FC<FieldMapperProps> = ({
  sourceFields,
  targetFields,
  mappings,
  onChange,
}) => {
  const getMappedTarget = (sourceField: string): string => {
    return mappings.find((m) => m.sourceField === sourceField)?.targetField ?? "(none)";
  };

  const handleChange = (sourceField: string, targetField: string) => {
    const updated = mappings.filter((m) => m.sourceField !== sourceField);
    if (targetField !== "(none)") {
      updated.push({ sourceField, targetField });
    }
    onChange(updated);
  };

  return (
    <div className="field-mapper">
      <div className="field-mapper-title">Field Mapping</div>
      <table className="field-mapper-table">
        <thead>
          <tr>
            <th>Source Field</th>
            <th>Webflow Field</th>
          </tr>
        </thead>
        <tbody>
          {sourceFields.map((sf) => (
            <tr key={sf}>
              <td>{sf}</td>
              <td>
                <select
                  value={getMappedTarget(sf)}
                  onChange={(e) => handleChange(sf, e.target.value)}
                  className="field-mapper-select"
                >
                  <option value="(none)">(none)</option>
                  {targetFields.map((tf) => (
                    <option key={tf.slug} value={tf.slug}>
                      {tf.displayName} ({tf.slug})
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FieldMapper;
