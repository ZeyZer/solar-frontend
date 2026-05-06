import {
  formatPostcodeInput,
} from "../utils/postcodeUtils";

export default function useFormHandlers({ setForm }) {
  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handlePostcodeChange(e) {
    const formatted = formatPostcodeInput(e.target.value);

    setForm((prev) => ({
      ...prev,
      postcode: formatted,
    }));
  }

  return {
    handleChange,
    handlePostcodeChange,
  };
}