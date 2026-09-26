import { PALETTE, type ContainerColor } from '../core';
import { colorName, STRINGS } from './strings';

const VISIBLE_ORDERS = 7;

/** The trucks waiting at the gate, first one (the only one that can be served) biggest. */
export function OrderQueue({ orders }: { readonly orders: readonly ContainerColor[] }) {
  const [next, ...rest] = orders;
  if (!next) return null;
  const shown = rest.slice(0, VISIBLE_ORDERS - 1);
  const hidden = rest.length - shown.length;

  return (
    <div className="orders" aria-label="Orders">
      <div className="order order--next" style={{ background: PALETTE[next].hex }}>
        <span className="order__label">{STRINGS.next}</span>
        <span className="order__name">{colorName(next)}</span>
      </div>
      {shown.map((color, index) => (
        <div
          key={index}
          className="order"
          style={{ background: PALETTE[color].hex }}
          aria-label={colorName(color)}
        />
      ))}
      {hidden > 0 && <span className="orders__more">+{hidden}</span>}
    </div>
  );
}
