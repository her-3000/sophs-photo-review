"""Create an isolated local collection after a model joins. No uploads or messages."""
import argparse
import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def create_model(slug, name):
    if not re.fullmatch(r'[a-z][a-z0-9-]{0,63}', slug) or slug in {'example', 'sophie', 'new-model'}:
        raise ValueError('Use a unique lowercase name such as mina-trau.')
    name = name.strip()
    if not name or len(name) > 100 or any(ord(c) < 32 for c in name):
        raise ValueError('Enter the model’s name, up to 100 characters.')
    profile = ROOT / 'profiles' / f'{slug}.json'
    data = ROOT / 'model-data' / slug
    if profile.exists() or data.exists():
        raise ValueError('That model already exists. Existing photos and choices are unchanged.')
    (data / 'archive').mkdir(parents=True)
    with (data / 'archive' / 'INDEX.csv').open('w', newline='') as stream:
        csv.writer(stream).writerow(['filename', 'publication_date', 'source_url'])
    config = {'id': slug, 'name': name, 'archive': f'model-data/{slug}/archive', 'data_dir': f'model-data/{slug}', 'initial_view': 'all'}
    profile.write_text(json.dumps(config, ensure_ascii=False, indent=2) + '\n')
    return profile

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Create a private SOPHS model collection')
    parser.add_argument('slug')
    parser.add_argument('name')
    args = parser.parse_args()
    try:
        profile = create_model(args.slug, args.name)
    except ValueError as error:
        parser.error(str(error))
    print(f'Created {profile.relative_to(ROOT)}. Photos and choices will stay separate.')
    print(f'Run: python3 server.py --profile profiles/{args.slug}.json --port 4190')
