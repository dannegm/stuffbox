"use client";;
import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { Children, cloneElement, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/helpers/utils";

export const Deck = ({
  className,
  ...props
}) => (
  <div className={cn("relative isolate", className)} {...props} />
);

// What a horizontal (drag-released) swipe looks like — a fixed tilt in the
// direction of travel. Exported so callers driving a *programmatic*
// left/right exit (e.g. a like/dislike button) render identically to an
// actual drag release instead of duplicating these numbers.
export const swipeExitSpec = (direction) => ({
  axis: "x",
  sign: direction === "right" ? 1 : -1,
  rotate: direction === "right" ? 25 : -25,
});

const DEFAULT_EXIT_SPEC = swipeExitSpec("left");

// Shared by every exit/entrance/depth transition and the JS timers that
// gate them (kept in lockstep — a timer out of sync with its own tween is
// exactly what caused the entrance/exit glitches earlier).
const TRANSITION_DURATION = 0.2;
const TRANSITION_MS = TRANSITION_DURATION * 1000;
const TRANSITION = { duration: TRANSITION_DURATION, ease: "easeOut" };

export const DeckCards = ({
  children,
  className,
  onSwipe,
  onSwipeEnd,
  threshold = 150,
  stackSize = 3,
  perspective = 1000,
  scale = 0.05,
  currentIndex: currentIndexProp,
  defaultCurrentIndex = 0,
  onCurrentIndexChange,
  animateOnIndexChange = true,
  // {axis: 'x'|'y', sign: 1|-1, rotate: number} — how the *next*
  // programmatic (non-drag) transition should look: which way the current
  // top card exits, or which side the next undo's returning card enters
  // from. Ignored for drag-released swipes, which compute their own spec
  // internally (see swipeExitSpec) since those are always horizontal.
  exitSpec = DEFAULT_EXIT_SPEC,
  // Bump this (any changing value) whenever the caller resets the deck
  // wholesale (reshuffle, filter change, clear-all) instead of stepping
  // through one card at a time — those all snap currentIndex to 0 too, which
  // would otherwise be indistinguishable from a plain one-step undo and
  // trigger an unwanted entrance animation on whatever card lands on top.
  resetToken,
  ...props
}) => {
  const childrenArray = Children.toArray(children);
  const [currentIndex, setCurrentIndex] = useControllableState({
    prop: currentIndexProp,
    defaultProp: defaultCurrentIndex,
    onChange: onCurrentIndexChange,
  });
  const [activeExitSpec, setActiveExitSpec] = useState(null);
  // Only set for the one card an undo brings back — mirrors the spec it
  // originally exited on, so DeckCard can seed its motion values there
  // instead of popping straight into place. Cleared at the start of the next
  // forward transition so a later, unrelated remount of the same key can't
  // accidentally replay it.
  const [enteringCard, setEnteringCard] = useState(null);
  const [displayIndex, setDisplayIndex] = useState(currentIndex);
  const isInternalChangeRef = useRef(false);
  const prevIndexRef = useRef(currentIndex);

  // Detect external currentIndex changes and trigger animation
  useEffect(() => {
    const prevIndex = prevIndexRef.current;
    const wasInternalChange = isInternalChangeRef.current;
    isInternalChangeRef.current = false;

    // Skip initial mount, and skip re-runs where currentIndex itself didn't
    // move — this effect also re-fires on childrenArray.length changes alone
    // (e.g. a caller appending more cards to `children` mid-session), and
    // forcing setDisplayIndex here would snap a card that's mid-exit
    // animation (from a prior, real currentIndex change) back into view.
    if (prevIndex === currentIndex) return;

    prevIndexRef.current = currentIndex;

    // Already handled inline by handleSwipe's own setTimeout below.
    if (wasInternalChange) return;

    if (currentIndex < prevIndex) {
      // Going backward (undo) — nothing here should look like a swipe. The
      // card currently on top just settles one layer back into the stack
      // (a plain scale/y prop change on a persisting element, handled by the
      // render below), and the returning card enters mirroring the exact
      // spec it originally left on.
      const returningChild = childrenArray[currentIndex];
      setEnteringCard(
        returningChild
          ? {
              key: returningChild.key ?? currentIndex,
              axis: exitSpec.axis,
              offset: exitSpec.sign * 500,
              rotate: exitSpec.rotate,
            }
          : null,
      );
      setDisplayIndex(currentIndex);
      return;
    }

    setEnteringCard(null);

    // Only animate if the option is enabled and we have cards to show
    if (animateOnIndexChange && prevIndex < childrenArray.length) {
      setActiveExitSpec(exitSpec);

      // Update display index after animation completes
      setTimeout(() => {
        setActiveExitSpec(null);
        setDisplayIndex(currentIndex);
      }, TRANSITION_MS);
    } else {
      // No animation, update display index immediately
      setDisplayIndex(currentIndex);
    }
  }, [
    currentIndex,
    animateOnIndexChange,
    exitSpec,
    childrenArray.length,
  ]);

  // Hard reset — snap straight to currentIndex with no exit/entrance
  // animation at all, and clear prevIndexRef so the effect above doesn't
  // treat this jump as a swipe once it also observes the same currentIndex
  // change. Runs after the effect above in the same commit (declared later),
  // so it always has the final say.
  useEffect(() => {
    if (resetToken === undefined) return;
    prevIndexRef.current = currentIndex;
    isInternalChangeRef.current = false;
    setActiveExitSpec(null);
    setEnteringCard(null);
    setDisplayIndex(currentIndex);
  }, [resetToken]);

  const handleSwipe = useCallback((direction) => {
    if (displayIndex >= childrenArray.length) {
      return;
    }

    setActiveExitSpec(swipeExitSpec(direction));

    if (direction === "left") {
      onSwipe?.(displayIndex, "left");
    } else {
      onSwipe?.(displayIndex, "right");
    }

    onSwipeEnd?.(displayIndex, direction);

    // Move to next card after animation
    setTimeout(() => {
      isInternalChangeRef.current = true;
      const newIndex = displayIndex + 1;
      setCurrentIndex(newIndex);
      setDisplayIndex(newIndex);
      setActiveExitSpec(null);
    }, TRANSITION_MS);
  }, [displayIndex, childrenArray.length, onSwipe, onSwipeEnd, setCurrentIndex]);

  const visibleCards = childrenArray.slice(displayIndex, displayIndex + stackSize);

  if (displayIndex >= childrenArray.length) {
    return null;
  }

  return (
    <div
      className={cn("relative z-10 size-full", className)}
      style={{ perspective }}
      {...props}>
      {visibleCards.map((child, index) => {
        const isTopCard = !index;
        const zIndex = stackSize - index;
        const scaleValue = 1 - index * scale;
        const yOffset = index * 4;
        const cardKey = child.key ?? index;
        const enterFrom =
          isTopCard && enteringCard?.key === cardKey
            ? { axis: enteringCard.axis, offset: enteringCard.offset, rotate: enteringCard.rotate }
            : null;

        return (
          <DeckCard
            isTop={isTopCard}
            key={cardKey}
            exitSpec={isTopCard ? activeExitSpec : null}
            enterFrom={enterFrom}
            onSwipe={handleSwipe}
            scale={scaleValue}
            y={yOffset}
            zIndex={zIndex}
            threshold={threshold}>
            {child}
          </DeckCard>
        );
      })}
    </div>
  );
};

// Three nested layers, each owning one independent transform concern, so
// they compose (translate/rotate/opacity all combine naturally across
// nested elements) instead of fighting over the same motion value:
//   - outer: depth in the stack (scale + small y offset) — always declarative,
//     unrelated to any exit/entrance.
//   - middle: a vertical exit/entrance (skip) — its own y/rotate, opacity
//     derived from y. Identity (0/0/1) unless a skip is actually involved.
//   - inner: a horizontal exit/entrance (like/dislike) plus the actual drag
//     gesture — x live-bound to drag, rotate/opacity derived from x.
// A card keeps the same nesting at every depth, so React never remounts it
// while it changes depth (e.g. sinking from top to depth 1 during an undo).
const DeckCard = ({
  children,
  isTop,
  zIndex,
  scale,
  y,
  onSwipe,
  threshold,
  exitSpec,
  enterFrom,
}) => {
  const yOffset = useMotionValue(enterFrom?.axis === "y" ? enterFrom.offset : 0);
  const yTilt = useMotionValue(enterFrom?.axis === "y" ? enterFrom.rotate : 0);
  const yOpacity = useTransform(yOffset, (value) => 1 - Math.min(Math.abs(value) / 500, 1));

  const x = useMotionValue(enterFrom?.axis === "x" ? enterFrom.offset : 0);
  const xTilt = useTransform(x, [-200, 200], [-25, 25]);
  const xOpacity = useTransform(x, [-200, -threshold, 0, threshold, 200], [0, 1, 1, 1, 0]);

  // Briefly true right after mount for a returning (undo) card only — keeps
  // drag off it until the entrance below has actually finished settling.
  const [isEntering, setIsEntering] = useState(!!enterFrom);

  // Drives the undo entrance directly on the relevant motion value(s) with
  // Motion's imperative `animate()`, instead of listing them in the
  // `animate` prop below. Whichever axis is involved is also live-bound to
  // drag or otherwise declaratively targeted elsewhere — asking the
  // declarative initial/animate system to *also* own it on mount doesn't
  // reliably tween against that. Calling `animate()` directly sidesteps
  // that; the derived rotate/opacity (horizontal case) or derived opacity
  // (vertical case) still update automatically via useTransform above,
  // whatever moves the underlying value.
  useEffect(() => {
    if (!enterFrom) return;
    const positionControls = animate(enterFrom.axis === "x" ? x : yOffset, 0, TRANSITION);
    const tiltControls = enterFrom.axis === "y" ? animate(yTilt, 0, TRANSITION) : null;
    const timeout = setTimeout(() => setIsEntering(false), TRANSITION_MS);
    return () => {
      positionControls.stop();
      tiltControls?.stop();
      clearTimeout(timeout);
    };
    // Intentionally run once on mount only — enterFrom only ever matters
    // for the render this instance was first created for.
  }, []);

  const handleDragEnd = (_, info) => {
    if (Math.abs(info.offset.x) > threshold) {
      onSwipe(info.offset.x > 0 ? "right" : "left");
    }
  };

  // Idle target is `{}`, not `{y: 0, rotate: 0}` — same reasoning as
  // `xAnimate` below: yOffset/yTilt are raw motion values the undo entrance
  // seeds off-screen and tweens back with an imperative animate() call.
  // Declaring them here too, with `initial={false}` on the element, makes
  // Framer snap them straight to 0 on mount, stomping that seed before the
  // imperative tween ever runs — which is exactly why the entrance wasn't
  // showing.
  const yAnimate =
    exitSpec?.axis === "y"
      ? { y: exitSpec.sign * 500, rotate: exitSpec.rotate, opacity: 0 }
      : {};

  const xAnimate =
    exitSpec?.axis === "x"
      ? { x: exitSpec.sign * 500, rotate: exitSpec.rotate, opacity: 0 }
      : {};

  const castedChildren = children;

  return (
    <motion.div
      animate={{ scale, y }}
      className="absolute inset-0"
      initial={false}
      style={{ zIndex }}
      transition={TRANSITION}>
      <motion.div
        animate={yAnimate}
        className="size-full"
        initial={false}
        style={{ y: yOffset, rotate: yTilt, opacity: yOpacity }}
        transition={TRANSITION}>
        <motion.div
          animate={xAnimate}
          className={cn(
            "size-full",
            isTop && !exitSpec && !isEntering && "cursor-grab active:cursor-grabbing",
          )}
          drag={isTop && !exitSpec && !isEntering ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          initial={false}
          onDragEnd={isTop && !isEntering ? handleDragEnd : undefined}
          style={{ x, rotate: xTilt, opacity: xOpacity }}
          transition={TRANSITION}
          whileDrag={isTop ? { scale: 1.05 } : undefined}>
          {cloneElement(castedChildren, {
            className: cn(
              "h-full w-full select-none rounded-lg shadow-lg",
              castedChildren.props.className
            ),
          })}
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export const DeckItem = ({
  className,
  ...props
}) => (
  <div
    className={cn(
      "flex h-full w-full items-center justify-center rounded-lg border bg-card text-card-foreground shadow-lg",
      className
    )}
    {...props} />
);

export const DeckEmpty = ({
  children,
  className,
  ...props
}) => (
  <div
    className={cn(
      "absolute inset-0 flex items-center justify-center rounded-lg border border-dashed text-muted-foreground",
      className
    )}
    {...props}>
    {children ?? <p className="text-sm">No more cards</p>}
  </div>
);
