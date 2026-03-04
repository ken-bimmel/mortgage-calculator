import { NumericFormat } from "react-number-format";

interface DollarNumberProps {
  value: number;
}

const DollarNumber: React.FC<DollarNumberProps> = ({ value }) => {
  return (
    <NumericFormat
      displayType="text"
      thousandSeparator
      valueIsNumericString
      prefix="$"
      decimalScale={2}
      value={value}
    />
  );
};

export default DollarNumber;
