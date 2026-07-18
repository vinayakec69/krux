# Contributing to KRUX

First off, thank you for considering contributing to KRUX! It's people like you that make KRUX such a great tool for a sustainable future.

## Where do I go from here?

If you've noticed a bug or have a feature request, make sure to check our [Issues](https://github.com/vinayakec69/krux/issues) first to see if someone else has already created a ticket. If not, go ahead and [make one](https://github.com/vinayakec69/krux/issues/new)!

## Fork & create a branch

If this is something you think you can fix, then fork KRUX and create a branch with a descriptive name.

A good branch name would be (where issue #325 is the ticket you're working on):

```sh
git checkout -b 325-add-new-plastic-type
```

## Implementation Guidelines

- Keep the UI clean and follow the existing Tailwind CSS design tokens.
- Ensure any hardware changes are thoroughly tested on the ESP32.
- Write clear commit messages.

## Make a Pull Request

At this point, you should switch back to your master branch and make sure it's up to date with KRUX's master branch:

```sh
git remote add upstream https://github.com/vinayakec69/krux.git
git checkout main
git pull upstream main
```

Then update your feature branch from your local copy of main, and push it!

```sh
git checkout 325-add-new-plastic-type
git rebase main
git push --set-upstream origin 325-add-new-plastic-type
```

Finally, go to GitHub and make a Pull Request. Thank you!
