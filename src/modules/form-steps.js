import { Debug } from "./debug";

// ============================================
// FormSteps — multi-step controller for Webflow Form Blocks
//   All steps live in ONE <form> so Webflow submits every field at once.
//   Panes are [data-step]; only the last pane holds the submit input.
//   Required choice groups and native field validity gate navigation.
//   A disabled fieldset gates Submit independently of Webflow's own disabled
//   state, so validation never unlocks its Turnstile or in-flight request lock.
// ============================================
export const FormSteps = (function () {
  function initOne(root) {
    var panes = Array.prototype.slice.call(
      root.querySelectorAll("[data-step]")
    );
    if (!panes.length) return;
    var form = root.matches("form") ? root : root.querySelector("form");
    if (!form) return;

    var label = root.querySelector("[data-step-label]");
    var err = root.querySelector("[data-step-err]");
    var nextButtons = root.querySelectorAll('[data-step-next]:not([type="submit"])');
    var backButtons = root.querySelectorAll("[data-step-back]");
    var submitGates = Array.prototype.map.call(
      form.querySelectorAll('button[type="submit"], input[type="submit"]'),
      function (button) {
        var gate = document.createElement("fieldset");
        gate.setAttribute("data-step-submit-gate", "");
        gate.disabled = true;
        button.before(gate);
        gate.appendChild(button);
        return gate;
      }
    );
    var i = 0;

    function missingGroup(pane) {
      return Array.prototype.find.call(
        pane.querySelectorAll("[data-step-required]"),
        function (group) { return !group.querySelector("input:checked:not(:disabled)"); }
      );
    }

    function invalidField(pane) {
      return Array.prototype.find.call(
        pane.querySelectorAll("input, select, textarea"),
        function (field) { return field.willValidate && !field.validity.valid; }
      );
    }

    function isValid(pane) {
      return !missingGroup(pane) && !invalidField(pane);
    }

    function syncButtons() {
      nextButtons.forEach(function (button) {
        button.disabled = i === panes.length - 1 || !isValid(panes[i]);
      });
      backButtons.forEach(function (button) {
        button.hidden = i === 0;
        button.disabled = i === 0;
      });
      var canSubmit = i === panes.length - 1 && panes.every(isValid);
      submitGates.forEach(function (gate) { gate.disabled = !canSubmit; });
    }

    // Later panes repeat what was chosen earlier, so the visitor keeps the
    // context. Webflow can place [data-step-summary] in a pane; otherwise it
    // goes after the pane header.
    function choiceText(input) {
      if (input.type === "radio" && input.value && input.value !== "on") return input.value;
      var field = input.closest("label");
      var text = field && field.querySelector(".form-check-label, .w-form-label");
      return (text || field || input).textContent.replace(/\s+/g, " ").trim();
    }

    function renderSummary(n) {
      var pane = panes[n];
      var box = pane.querySelector("[data-step-summary]");
      if (n === 0) return;
      var picked = [];
      panes.slice(0, n).forEach(function (p) {
        p.querySelectorAll("input[type=checkbox]:checked, input[type=radio]:checked").forEach(function (input) {
          var text = choiceText(input);
          if (text) picked.push(text);
        });
      });
      if (!box) {
        if (!picked.length) return;
        box = document.createElement("div");
        box.setAttribute("data-step-summary", "");
        var header = pane.querySelector(".form-pane-header");
        if (header) header.after(box);
        else pane.prepend(box);
      }
      box.textContent = "";
      box.hidden = !picked.length;
      if (!picked.length) return;
      var title = document.createElement("p");
      title.className = "form-step-summary-label";
      title.textContent = "Your selections";
      var list = document.createElement("ul");
      list.className = "form-step-summary-list";
      picked.forEach(function (text) {
        var item = document.createElement("li");
        item.className = "form-step-summary-item";
        item.textContent = text;
        list.appendChild(item);
      });
      box.append(title, list);
    }

    function show(next, focus) {
      i = Math.max(0, Math.min(panes.length - 1, next));
      renderSummary(i);
      panes.forEach(function (p, n) {
        p.hidden = n !== i;
        p.classList.toggle("is-active", n === i);
      });
      if (label) label.textContent = "Step " + (i + 1) + " of " + panes.length;
      if (err) err.hidden = true;
      syncButtons();
      var focusable = panes[i].querySelector("input, select, textarea, button");
      if (focus !== false && focusable) focusable.focus({ preventScroll: true });
      Debug.log("FormSteps: step", i + 1, "of", panes.length);
    }

    function validate(pane) {
      var group = missingGroup(pane);
      if (group) {
        if (err) err.hidden = false;
        return false;
      }
      var field = invalidField(pane);
      if (field) {
        field.reportValidity();
        return false;
      }
      return true;
    }

    root.addEventListener("click", function (e) {
      var next = e.target.closest ? e.target.closest('[data-step-next]:not([type="submit"])') : null;
      var back = e.target.closest ? e.target.closest("[data-step-back]") : null;
      if (next) {
        e.preventDefault();
        if (validate(panes[i])) show(i + 1);
        return;
      }
      if (back) {
        e.preventDefault();
        show(i - 1);
      }
    });

    function onEdit() {
      if (err) err.hidden = true;
      syncButtons();
    }
    root.addEventListener("input", onEdit);
    root.addEventListener("change", onEdit);
    root.addEventListener("focusin", syncButtons);
    window.addEventListener("pageshow", syncButtons);
    form.addEventListener("reset", function () {
      // The browser restores default values after the reset event.
      setTimeout(function () { show(0, false); }, 0);
    });

    // Enter on an earlier pane advances only that pane. It must not try to
    // submit while required fields in later panes are still hidden.
    form.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" || e.isComposing || i === panes.length - 1) return;
      if (!e.target.matches("input:not([type=button]):not([type=submit])")) return;
      e.preventDefault();
      if (validate(panes[i])) show(i + 1);
    });
    form.addEventListener("submit", function (e) {
      syncButtons();
      var invalidPane = panes.findIndex(function (pane) { return !isValid(pane); });
      if (i !== panes.length - 1 || invalidPane !== -1) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (invalidPane !== -1) {
          show(invalidPane);
          validate(panes[invalidPane]);
        }
      }
    }, true);

    show(0, false);
  }

  function init() {
    var roots = document.querySelectorAll("[data-form-steps]");
    roots.forEach(initOne);
    Debug.log("FormSteps: init — forms:", roots.length);
  }

  return { init: init };
})();
