import cx from "./cx";

const styles = {
  button: "btnGhost rounded-full px-3 py-1.5",
};

export default function ButtonLink({ children, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(styles.button, className)}
    >
      {children}
    </button>
  );
}