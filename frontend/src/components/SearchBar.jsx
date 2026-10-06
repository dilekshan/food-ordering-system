import { useState } from "react";

export default function SearchBar({ initial = "", onSearch }) {
  const [value, setValue] = useState(initial);
  return (
    <form className="searchbar" onSubmit={(e) => { e.preventDefault(); onSearch(value.trim()); }}>
      <input placeholder="Search for food..." value={value} onChange={(e) => setValue(e.target.value)} />
      <button className="btn" type="submit">Search</button>
    </form>
  );
}
