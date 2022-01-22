import { Vector2 } from "three";

export class PointerState {
  pointers: PointerEvent[] = [];

  addPointer = (event: PointerEvent) => {
    this.pointers.push(event);
  };

  private pointerPositions: { [key: string]: Vector2 } = {};

  removePointer(event: PointerEvent) {
    delete this.pointerPositions[event.pointerId];

    for (let i = 0; i < this.pointers.length; i++) {
      if (this.pointers[i].pointerId == event.pointerId) {
        this.pointers.splice(i, 1);
        return;
      }
    }
  }

  trackPointer(event: PointerEvent) {
    let position = this.pointerPositions[event.pointerId];

    if (position === undefined) {
      position = new Vector2();
      this.pointerPositions[event.pointerId] = position;
    }

    position.set(event.pageX, event.pageY);
  }

  private getSecondPointerPosition(event: PointerEvent) {
    const pointer =
      event.pointerId === this.pointers[0].pointerId
        ? this.pointers[1]
        : this.pointers[0];
    return this.pointerPositions[pointer.pointerId];
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
