import os
import glob

replacements = {
    "⚡": '<img src="src/icons/icon-logo.svg" class="svg-icon" alt="logo">',
    "📊": '<img src="src/icons/icon-dashboard.svg" class="svg-icon" alt="dashboard">',
    "🧮": '<img src="src/icons/icon-formula.svg" class="svg-icon" alt="formula">',
    "🤖": '<img src="src/icons/icon-ai-nav.svg" class="svg-icon" alt="ai">',
    "🎯": '<img src="src/icons/icon-avatar.svg" class="svg-icon" alt="avatar">',
    "📝": '<img src="src/icons/icon-tests-taken.svg" class="svg-icon" alt="tests">',
    "📈": '<img src="src/icons/icon-trend.svg" class="svg-icon" alt="trend">',
    "🏆": '<img src="src/icons/icon-trophy.svg" class="svg-icon" alt="trophy">',
    "📄": '<img src="src/icons/icon-export.svg" class="svg-icon" alt="export">',
    "🔗": '<img src="src/icons/icon-import.svg" class="svg-icon" alt="import">',
    "🗑️": '<img src="src/icons/icon-delete.svg" class="svg-icon" alt="delete">',
    "🗑": '<img src="src/icons/icon-delete.svg" class="svg-icon" alt="delete">',
    "🔮": '<img src="src/icons/icon-predictive.svg" class="svg-icon" alt="predictive">',
    "📅": '<img src="src/icons/icon-activity.svg" class="svg-icon" alt="activity">',
    "✅": '<img src="src/icons/icon-success.svg" class="svg-icon" alt="success">',
    "⚠️": '<img src="src/icons/icon-warning.svg" class="svg-icon" alt="warning">',
    "📌": '<img src="src/icons/icon-pin.svg" class="svg-icon" alt="pin">',
    "🔖": '<img src="src/icons/icon-tag.svg" class="svg-icon" alt="tag">',
    "📚": '<img src="src/icons/icon-formula.svg" class="svg-icon" alt="books">',
    "👻": '<img src="src/icons/icon-ghost.svg" class="svg-icon" alt="ghost">',
    "⏱️": '<img src="src/icons/icon-activity.svg" class="svg-icon" alt="time">',
    "⏱": '<img src="src/icons/icon-activity.svg" class="svg-icon" alt="time">',
    "📂": '<img src="src/icons/icon-import.svg" class="svg-icon" alt="folder">',
    "📥": '<img src="src/icons/icon-import.svg" class="svg-icon" alt="inbox">',
    "🧾": '<img src="src/icons/icon-export.svg" class="svg-icon" alt="receipt">',
    "💡": '<img src="src/icons/icon-hint.svg" class="svg-icon" alt="hint">',
    "<span>+</span> Add Test": '<img src="src/icons/icon-add.svg" class="svg-icon" alt="add"> Add Test',
    "+ Add Manually": '<img src="src/icons/icon-add.svg" class="svg-icon" alt="add"> Add Manually'
}

files = glob.glob("*.html") + glob.glob("src/*.js")
for f in files:
    with open(f, "r", encoding="utf-8") as file:
        content = file.read()
    
    modified = content
    for emoji, img in replacements.items():
        if emoji in modified:
            modified = modified.replace(emoji, img)
            
    if modified != content:
        with open(f, "w", encoding="utf-8") as file:
            file.write(modified)
        print(f"Updated {f}")
