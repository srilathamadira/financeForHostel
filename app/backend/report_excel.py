from openpyxl import Workbook
import os

def build_excel(summary, month):

    os.makedirs("reports", exist_ok=True)   # ✅ ensure folder exists

    file_path = f"reports/report_{month}.xlsx"

    wb = Workbook()
    ws = wb.active
    ws.title = "Summary"

    ws.append(["Month", month])
    ws.append([])
    ws.append(["Total Revenue", summary["total_revenue"]])
    ws.append(["Total Expenses", summary["total_expenses"]])
    ws.append(["Net Profit", summary["net_profit"]])

    ws.append([])
    ws.append(["Category", "Amount"])

    for c in summary["category_data"]:
        ws.append([c["name"], c["value"]])

    wb.save(file_path)

    print("Saved report:", file_path)   # ✅ debug line

    return file_path
