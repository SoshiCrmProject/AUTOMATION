type Shop = { id: string; name: string };

type Props = {
  shops: Shop[];
  selected: string[];
  onToggle: (id: string) => void;
};

export default function ShopSelector({ shops, selected, onToggle }: Props) {
  return (
    <div>
      {shops.map((shop) => (
        <label key={shop.id} style={{ display: "block", marginBottom: "6px" }}>
          <input
            type="checkbox"
            checked={selected.includes(shop.id)}
            onChange={() => onToggle(shop.id)}
          />{" "}
          {shop.name}
        </label>
      ))}
    </div>
  );
}
