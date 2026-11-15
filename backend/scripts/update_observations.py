"""Run from backend: python -m scripts.update_observations --lat ... --lon ... --retrain."""
import argparse
import asyncio
from datetime import date
import json
from app.ingestion.updater import update_observations, process_pending


async def run(args):
    if args.pending or args.watch:
        while True:
            result=await process_pending()
            if result:
                print(json.dumps(result),flush=True)
            if not args.watch:
                return
            await asyncio.sleep(15)
    else:
        if args.lat is None or args.lon is None:
            raise SystemExit("Provide --lat and --lon, or use --pending/--watch.")
        print(json.dumps(await update_observations(args.lat,args.lon,args.start,args.end,args.retrain)),flush=True)


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lat",type=float);parser.add_argument("--lon",type=float)
    parser.add_argument("--start",type=date.fromisoformat,default=date(2023,1,1))
    parser.add_argument("--end",type=date.fromisoformat)
    parser.add_argument("--retrain",action="store_true")
    parser.add_argument("--pending",action="store_true");parser.add_argument("--watch",action="store_true")
    asyncio.run(run(parser.parse_args()))
