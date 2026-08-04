# Step 17: UI polish

*This is a scope spec, not a built step. The folder ships later; this README
is its written contract so the scope is documented rather than remembered.*

Every earlier step ships its feature with a deliberately simpler UI than the
source app. That is on purpose: a plainer screen keeps the feature's logic
readable while you are learning it, so the row list, the extra tap, and the
placeholder layout are teaching aids, not the finished product. This step is
where the app converges on its full design. It applies the source app's visual
refinements and trims every unnecessary tap, without dropping a single piece of
functionality any earlier step shipped. Nothing here adds a feature; it makes
the features already built look and feel like the real product.

## Scope

Drawn from the divergences the earlier steps left behind on purpose. Each box
is a refinement the source app has and the tutorial steps do not yet.

### Product detail

- [ ] The glass price pill sits beside a **View Product** action.
- [ ] The **Add to Wishlist** call to action is the floating pill.

### In-app browser

- [ ] Floating translucent pill chrome that auto-hides on scroll.
- [ ] The recent-brands switcher strip.
- [ ] No visible URL bar.

### Directories

- [ ] Image-forward grid layouts (storefront card grid, brand logo wall)
      replace the row lists.
- [ ] Masonry product grid driven by real image aspect ratios.

### Workflow convergence and click minimization

- [ ] Inline quick-create wishlist inside the add flow, with no dead-end
      detour.
- [ ] Last-used-wishlist preselect.
- [ ] One-tap store switching in the browser.
- [ ] Profile aggregated all-items view.
- [ ] Editable wish name before save.
- [ ] Paste a URL to scrape.

### Appended by later steps

- [ ] Later steps append here as they find polish items. When a step ships a
      feature with a simpler UI than the source app, it records the gap in
      this list so this step closes it.
