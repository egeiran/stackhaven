import { PALETTE, type ContainerColor } from '../core';

interface YardViewProps {
  /** Colours per stack, bottom first. */
  readonly stacks: readonly (readonly ContainerColor[])[];
  readonly maxHeight: number;
  /** The order the truck is waiting for, if any. */
  readonly nextOrder: ContainerColor | undefined;
  readonly selected: number | null;
  readonly onStack: (stack: number) => void;
  /** Clicking a container; defaults to clicking its stack. */
  readonly onContainer?: (stack: number, height: number) => void;
  readonly onTruck?: () => void;
}

/** A flat, clickable picture of the yard: stacks as columns, the truck on the right. */
export function YardView(props: YardViewProps) {
  const { stacks, maxHeight, nextOrder, selected, onStack, onContainer, onTruck } = props;
  return (
    <div className="yard">
      {stacks.map((stack, index) => (
        <div key={index} className="yard__column">
          <button
            className={index === selected ? 'yard__stack yard__stack--selected' : 'yard__stack'}
            onClick={() => onStack(index)}
            aria-label={`Stack ${index}`}
          >
            {Array.from({ length: maxHeight }, (_, height) => {
              const color = stack[height];
              if (!color) return <span key={height} className="yard__slot" />;
              return (
                <span
                  key={height}
                  className="yard__container"
                  style={{ background: PALETTE[color].hex }}
                  title={onContainer ? `Remove ${PALETTE[color].label.toLowerCase()}` : undefined}
                  onClick={
                    onContainer
                      ? (event) => {
                          event.stopPropagation();
                          onContainer(index, height);
                        }
                      : undefined
                  }
                />
              );
            })}
          </button>
          <span className="yard__index">{index}</span>
        </div>
      ))}
      <div className="yard__column">
        <button
          className="yard__truck"
          onClick={onTruck}
          disabled={!onTruck}
          style={{ borderColor: nextOrder ? PALETTE[nextOrder].hex : undefined }}
          aria-label="Truck"
        >
          <span
            className="yard__truck-load"
            style={{ background: nextOrder ? PALETTE[nextOrder].hex : undefined }}
          />
          🚚
        </button>
        <span className="yard__index">truck</span>
      </div>
    </div>
  );
}
