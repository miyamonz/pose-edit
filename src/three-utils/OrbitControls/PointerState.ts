import { Vector2 } from "three";

export class PointerState {
  pointers: PointerEvent[] = [];
  get pointerVecs() {
    return [...this.pointerPositions.values()];
  }

  addPointer = (event: PointerEvent) => {
    this.pointers.push(event);
  };

  pointerPositions = new Map<number, Vector2>();

  removePointer(event: PointerEvent) {
    this.pointerPositions.delete(event.pointerId);

    for (let i = 0; i < this.pointers.length; i++) {
      if (this.pointers[i].pointerId == event.pointerId) {
        this.pointers.splice(i, 1);
        return;
      }
    }
  }

  trackPointer(event: PointerEvent) {
    let position = this.pointerPositions.get(event.pointerId);

    if (position === undefined) {
      position = new Vector2();
      this.pointerPositions.set(event.pointerId, position);
    }

    position.set(event.pageX, event.pageY);
  }

  private getSecondPointerPosition(event: PointerEvent) {
    const pointer =
      event.pointerId === this.pointers[0].pointerId
        ? this.pointers[1]
        : this.pointers[0];
    return this.pointerPositions.get(pointer.pointerId);
  }
}

export function getSecondPointer(
  event: PointerEvent,
  pointers: PointerEvent[]
) {
  const pointer =
    event.pointerId === pointers[0].pointerId ? pointers[1] : pointers[0];
  return pointer;
}
